import { logger } from '../utils/logger';
import { configManager } from '../utils/config';

// 条件导入Electron模块
let BrowserWindow: any = null;
let ipcMain: any = null;

try {
  const electron = require('electron');
  if (typeof electron === 'object' && electron.BrowserWindow) {
    BrowserWindow = electron.BrowserWindow;
    ipcMain = electron.ipcMain;
  }
} catch (error) {
  logger.warn('Electron模块不可用，运行在非Electron环境中');
}

export interface BrowserOptions {
  show: boolean;
  width: number;
  height: number;
  userAgent?: string;
  proxy?: string;
}

export interface NavigationEvent {
  url: string;
  title: string;
  timestamp: number;
  type: 'navigate' | 'navigate-in-page';
}

export interface LoginStatus {
  isLoggedIn: boolean;
  username?: string;
  avatar?: string;
  lastCheck: number;
}

class BrowserManager {
  private weiboWindow: any = null;
  private isInitialized = false;
  private navigationHistory: NavigationEvent[] = [];
  private loginStatus: LoginStatus = {
    isLoggedIn: false,
    lastCheck: 0,
  };

  constructor() {
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    // 只在Electron可用时设置IPC处理器
    if (!ipcMain) {
      logger.warn('ipcMain不可用，跳过IPC处理器设置');
      return;
    }
    
    // 处理来自渲染进程的消息
    ipcMain.handle('browser-execute-js', async (_event: any, code: string) => {
      if (this.weiboWindow) {
        try {
          const result = await this.weiboWindow.webContents.executeJavaScript(code);
          return { success: true, result };
        } catch (error) {
          logger.error('执行 JavaScript 失败:', error);
          return { success: false, error: error instanceof Error ? error.message : '未知错误' };
        }
      }
      return { success: false, error: '浏览器窗口未初始化' };
    });

    ipcMain.handle('browser-get-url', async () => {
      if (this.weiboWindow) {
        return this.weiboWindow.webContents.getURL();
      }
      return null;
    });

    ipcMain.handle('browser-get-title', async () => {
      if (this.weiboWindow) {
        return this.weiboWindow.webContents.getTitle();
      }
      return null;
    });

    ipcMain.handle('browser-check-login', async () => {
      return await this.checkLoginStatus();
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('浏览器管理器已初始化');
      return;
    }

    if (!BrowserWindow) {
      logger.warn('BrowserWindow不可用，跳过浏览器管理器初始化');
      this.isInitialized = true;
      return;
    }

    try {
      await this.createWeiboWindow();
      this.isInitialized = true;
      logger.info('浏览器管理器初始化成功');
    } catch (error) {
      logger.error('浏览器管理器初始化失败:', error);
      throw error;
    }
  }

  private async createWeiboWindow(): Promise<void> {
    if (!BrowserWindow) {
      throw new Error('BrowserWindow不可用');
    }
    
    const config = configManager.getWeiboConfig();
    
    this.weiboWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // 默认隐藏
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    // 设置用户代理
    if (config.userAgent) {
      this.weiboWindow.webContents.setUserAgent(config.userAgent);
    }

    // 监听页面导航事件
    this.weiboWindow.webContents.on('did-navigate', (_event: any, url: string) => {
      this.handleNavigation('navigate', url);
    });

    this.weiboWindow.webContents.on('did-navigate-in-page', (_event: any, url: string) => {
      this.handleNavigation('navigate-in-page', url);
    });

    this.weiboWindow.webContents.on('did-finish-load', () => {
      this.handlePageLoad();
    });

    this.weiboWindow.webContents.on('did-fail-load', (_event: any, errorCode: any, errorDescription: any) => {
      logger.error('页面加载失败:', { errorCode, errorDescription });
    });

    this.weiboWindow.on('closed', () => {
      this.weiboWindow = null;
      logger.info('微博浏览器窗口已关闭');
    });

    // 加载微博页面
    await this.weiboWindow.loadURL('https://weibo.com');
    logger.info('微博浏览器窗口创建成功');
  }

  private handleNavigation(type: 'navigate' | 'navigate-in-page', url: string): void {
    const event: NavigationEvent = {
      url,
      title: this.weiboWindow?.webContents.getTitle() || '',
      timestamp: Date.now(),
      type,
    };

    this.navigationHistory.push(event);
    
    // 保持历史记录在合理范围内
    if (this.navigationHistory.length > 100) {
      this.navigationHistory = this.navigationHistory.slice(-50);
    }

    logger.info('页面导航事件', { type, url, title: event.title });

    // 检测特殊页面
    this.detectSpecialPages(url);
  }

  private handlePageLoad(): void {
    logger.info('页面加载完成');
    
    // 注入检测脚本
    this.injectDetectionScripts();
    
    // 检查登录状态
    this.checkLoginStatus();
  }

  private detectSpecialPages(url: string): void {
    // 检测登录页面
    if (url.includes('login') || url.includes('passport')) {
      logger.warn('检测到登录页面，可能需要用户手动登录');
      this.showWindow();
    }

    // 检测验证码页面
    if (url.includes('captcha') || url.includes('verify')) {
      logger.warn('检测到验证码页面');
      this.showWindow();
    }

    // 检测风控页面
    if (url.includes('security') || url.includes('risk')) {
      logger.warn('检测到风控页面');
      this.showWindow();
    }
  }

  private async injectDetectionScripts(): Promise<void> {
    if (!this.weiboWindow) return;

    try {
      // 注入登录状态检测脚本
      await this.weiboWindow.webContents.executeJavaScript(`
        (function() {
          // 检测登录状态
          window.weiboLoginStatus = {
            isLoggedIn: false,
            username: null,
            avatar: null
          };

          // 检查是否有用户信息
          const userInfo = document.querySelector('[data-user-id]') || 
                          document.querySelector('.gn_name') ||
                          document.querySelector('.username');
          
          if (userInfo) {
            window.weiboLoginStatus.isLoggedIn = true;
            window.weiboLoginStatus.username = userInfo.textContent || userInfo.getAttribute('data-user-id');
          }

          // 检查头像
          const avatar = document.querySelector('.gn_avatar img') || 
                        document.querySelector('.avatar img');
          if (avatar) {
            window.weiboLoginStatus.avatar = avatar.src;
          }

          console.log('微博登录状态检测完成:', window.weiboLoginStatus);
        })();
      `);

      // 注入页面变化监听
      await this.weiboWindow.webContents.executeJavaScript(`
        (function() {
          // 监听页面变化
          const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
              if (mutation.type === 'childList') {
                // 检查是否有新的登录信息
                const userInfo = document.querySelector('[data-user-id]') || 
                                document.querySelector('.gn_name');
                if (userInfo && !window.weiboLoginStatus.isLoggedIn) {
                  window.weiboLoginStatus.isLoggedIn = true;
                  window.weiboLoginStatus.username = userInfo.textContent || userInfo.getAttribute('data-user-id');
                  console.log('检测到用户登录:', window.weiboLoginStatus);
                }
              }
            });
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        })();
      `);

      logger.info('检测脚本注入成功');
    } catch (error) {
      logger.error('注入检测脚本失败:', error);
    }
  }

  public async checkLoginStatus(): Promise<LoginStatus> {
    if (!this.weiboWindow) {
      return this.loginStatus;
    }

    try {
      const result = await this.weiboWindow.webContents.executeJavaScript(`
        window.weiboLoginStatus || { isLoggedIn: false, username: null, avatar: null }
      `);

      this.loginStatus = {
        isLoggedIn: result.isLoggedIn || false,
        username: result.username || undefined,
        avatar: result.avatar || undefined,
        lastCheck: Date.now(),
      };

      logger.info('登录状态检查完成', this.loginStatus);
      return this.loginStatus;
    } catch (error) {
      logger.error('检查登录状态失败:', error);
      return this.loginStatus;
    }
  }

  public async executeJavaScript(code: string, retries = 3): Promise<any> {
    if (!this.weiboWindow) {
      throw new Error('浏览器窗口未初始化');
    }

    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        const result = await this.weiboWindow.webContents.executeJavaScript(code);
        logger.debug('JavaScript 执行成功', { attempt: i + 1, code: code.substring(0, 100) });
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');
        logger.warn('JavaScript 执行失败，重试中', { 
          attempt: i + 1, 
          error: lastError.message,
          code: code.substring(0, 100)
        });
        
        if (i < retries - 1) {
          // 指数退避
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('JavaScript 执行失败');
  }

  public showWindow(): void {
    if (this.weiboWindow) {
      this.weiboWindow.show();
      this.weiboWindow.focus();
      logger.info('显示微博浏览器窗口');
    }
  }

  public hideWindow(): void {
    if (this.weiboWindow) {
      this.weiboWindow.hide();
      logger.info('隐藏微博浏览器窗口');
    }
  }

  public getWindow(): any {
    return this.weiboWindow;
  }

  public getNavigationHistory(): NavigationEvent[] {
    return [...this.navigationHistory];
  }

  public getLoginStatus(): LoginStatus {
    return { ...this.loginStatus };
  }

  public async close(): Promise<void> {
    if (this.weiboWindow) {
      this.weiboWindow.close();
      this.weiboWindow = null;
    }
    this.isInitialized = false;
    logger.info('浏览器管理器已关闭');
  }
}

export const browserManager = new BrowserManager();
