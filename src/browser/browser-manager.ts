import { logger } from '../utils/logger';
import { configManager, BrowserFingerprint } from '../utils/config';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

// 条件导入Electron模块
let BrowserWindow: any = null;
let ipcMain: any = null;

try {
  const electron = require('electron');
  if (typeof electron === 'object' && electron.BrowserWindow) {
    BrowserWindow = electron.BrowserWindow;
    ipcMain = electron.ipcMain;
    logger.info('Electron模块加载成功');
  } else {
    logger.warn('Electron模块结构异常');
  }
} catch (error) {
  logger.warn('Electron模块不可用，运行在非Electron环境中:', error);
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
  private playwrightBrowser: Browser | null = null;
  private playwrightContext: BrowserContext | null = null;
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
      width: config.browserFingerprint.viewport.width,
      height: config.browserFingerprint.viewport.height,
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

    // 设置浏览器指纹
    await this.setupBrowserFingerprint(config.browserFingerprint);

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

  private async setupBrowserFingerprint(fingerprint: BrowserFingerprint): Promise<void> {
    if (!this.weiboWindow) return;

    try {
      // 等待页面加载完成后再设置指纹
      this.weiboWindow.webContents.once('did-finish-load', async () => {
        await this.injectBrowserFingerprint(fingerprint);
      });
    } catch (error) {
      logger.error('设置浏览器指纹失败:', error);
    }
  }

  private async injectBrowserFingerprint(fingerprint: BrowserFingerprint): Promise<void> {
    if (!this.weiboWindow) return;

    try {
      const fingerprintScript = `
        (function() {
          // 设置语言和地区
          Object.defineProperty(navigator, 'language', {
            get: () => '${fingerprint.locale}',
            configurable: true
          });
          
          Object.defineProperty(navigator, 'languages', {
            get: () => ${JSON.stringify(fingerprint.languages)},
            configurable: true
          });

          // 设置平台
          Object.defineProperty(navigator, 'platform', {
            get: () => '${fingerprint.platform}',
            configurable: true
          });

          // 设置时区
          const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
          Date.prototype.getTimezoneOffset = function() {
            return ${fingerprint.timezoneOffset};
          };

          // 设置屏幕信息
          Object.defineProperty(screen, 'width', {
            get: () => ${fingerprint.screen.width},
            configurable: true
          });
          
          Object.defineProperty(screen, 'height', {
            get: () => ${fingerprint.screen.height},
            configurable: true
          });
          
          Object.defineProperty(screen, 'colorDepth', {
            get: () => ${fingerprint.screen.colorDepth},
            configurable: true
          });

          // 设置地理位置
          if (navigator.geolocation) {
            const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
            navigator.geolocation.getCurrentPosition = function(success, error, options) {
              if (success) {
                success({
                  coords: {
                    latitude: ${fingerprint.geolocation.latitude},
                    longitude: ${fingerprint.geolocation.longitude},
                    accuracy: ${fingerprint.geolocation.accuracy},
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null
                  },
                  timestamp: Date.now()
                });
              }
            };
          }

          // 设置视口大小
          Object.defineProperty(window, 'innerWidth', {
            get: () => ${fingerprint.viewport.width},
            configurable: true
          });
          
          Object.defineProperty(window, 'innerHeight', {
            get: () => ${fingerprint.viewport.height},
            configurable: true
          });

          // 设置outerWidth和outerHeight
          Object.defineProperty(window, 'outerWidth', {
            get: () => ${fingerprint.viewport.width},
            configurable: true
          });
          
          Object.defineProperty(window, 'outerHeight', {
            get: () => ${fingerprint.viewport.height},
            configurable: true
          });

          console.log('浏览器指纹设置完成:', {
            locale: '${fingerprint.locale}',
            timezone: '${fingerprint.timezone}',
            platform: '${fingerprint.platform}',
            languages: ${JSON.stringify(fingerprint.languages)}
          });
        })();
      `;

      await this.weiboWindow.webContents.executeJavaScript(fingerprintScript);
      logger.info('浏览器指纹注入成功');
    } catch (error) {
      logger.error('注入浏览器指纹失败:', error);
    }
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
    
    // 模拟用户行为
    this.simulateUserBehavior();
    
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

  private async simulateUserBehavior(): Promise<void> {
    const config = configManager.getWeiboConfig();
    const behavior = config.userBehavior;

    try {
      // 随机等待时间
      if (behavior.randomDelay) {
        const waitTime = Math.random() * (behavior.maxWaitTime - behavior.minWaitTime) + behavior.minWaitTime;
        logger.info(`模拟用户等待 ${Math.round(waitTime)}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // 模拟焦点事件
      if (behavior.simulateFocus) {
        await this.simulateFocusEvents();
      }

      // 模拟鼠标移动
      if (behavior.simulateMouseMove) {
        await this.simulateMouseMovement();
      }

      // 模拟滚动
      if (behavior.simulateScroll) {
        await this.simulateScrolling();
      }

      logger.info('用户行为模拟完成');
    } catch (error) {
      logger.error('用户行为模拟失败:', error);
    }
  }

  private async simulateFocusEvents(): Promise<void> {
    if (!this.weiboWindow) return;

    try {
      const focusScript = `
        (function() {
          // 模拟窗口焦点
          window.focus();
          document.body.focus();
          
          // 模拟焦点事件
          const focusEvent = new Event('focus', { bubbles: true });
          window.dispatchEvent(focusEvent);
          document.dispatchEvent(focusEvent);
          
          console.log('焦点事件模拟完成');
        })();
      `;
      
      await this.weiboWindow.webContents.executeJavaScript(focusScript);
    } catch (error) {
      logger.error('模拟焦点事件失败:', error);
    }
  }

  private async simulateMouseMovement(): Promise<void> {
    if (!this.weiboWindow) return;

    try {
      const mouseScript = `
        (function() {
          // 生成随机鼠标位置
          const x = Math.random() * window.innerWidth;
          const y = Math.random() * window.innerHeight;
          
          // 创建鼠标移动事件
          const mouseMoveEvent = new MouseEvent('mousemove', {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true
          });
          
          document.dispatchEvent(mouseMoveEvent);
          
          // 模拟鼠标悬停
          const mouseOverEvent = new MouseEvent('mouseover', {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true
          });
          
          document.dispatchEvent(mouseOverEvent);
          
          console.log('鼠标移动模拟完成:', { x: Math.round(x), y: Math.round(y) });
        })();
      `;
      
      await this.weiboWindow.webContents.executeJavaScript(mouseScript);
    } catch (error) {
      logger.error('模拟鼠标移动失败:', error);
    }
  }

  private async simulateScrolling(): Promise<void> {
    if (!this.weiboWindow) return;

    try {
      const scrollScript = `
        (function() {
          // 随机滚动距离
          const scrollY = Math.random() * 500 + 100;
          
          // 平滑滚动
          window.scrollTo({
            top: scrollY,
            behavior: 'smooth'
          });
          
          // 模拟滚动事件
          setTimeout(() => {
            const scrollEvent = new Event('scroll', { bubbles: true });
            window.dispatchEvent(scrollEvent);
            document.dispatchEvent(scrollEvent);
            
            console.log('滚动模拟完成:', { scrollY: Math.round(scrollY) });
          }, 500);
        })();
      `;
      
      await this.weiboWindow.webContents.executeJavaScript(scrollScript);
    } catch (error) {
      logger.error('模拟滚动失败:', error);
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
    
    logger.info(`🔗 [调用链追踪] Step 7.1: weiboWindow.webContents.executeJavaScript() → 最终执行点`);

    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        logger.info(`🔗 [调用链追踪] Step 7.2: 尝试执行 (${i + 1}/${retries})`);
        const result = await this.weiboWindow.webContents.executeJavaScript(code);
        logger.info(`🔗 [调用链追踪] Step 7.3: 执行成功，返回结果`);
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

  /**
   * 在页面上下文中执行脚本（网页版MCP核心功能）
   */
  public async executeScript(script: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info(`🔗 [调用链追踪] Step 6: browserManager.executeScript() → 开始执行`);
      
      // 检查是否在Electron环境中
      if (!BrowserWindow) {
        logger.warn('不在Electron环境中，无法执行页面脚本');
        return { 
          success: false, 
          error: '需要Electron环境才能执行页面脚本。请使用 pnpm run dev:electron 启动' 
        };
      }
      
      logger.info(`🔗 [调用链追踪] Step 6.1: BrowserWindow检查通过`);

      if (!this.weiboWindow) {
        logger.info(`🔗 [调用链追踪] Step 6.2: weiboWindow未初始化，开始初始化`);
        // 如果浏览器窗口未初始化，尝试初始化
        await this.initialize();
      }

      if (!this.weiboWindow) {
        logger.error(`🔗 [调用链追踪] Step 6.3: weiboWindow初始化失败`);
        return { success: false, error: '浏览器窗口未初始化' };
      }
      
      logger.info(`🔗 [调用链追踪] Step 6.4: weiboWindow已就绪，准备执行JavaScript`);

      // 页面加载检查（可选）
      // await this.waitForNavigation();

      // 执行脚本
      logger.info(`🔗 [调用链追踪] Step 7: browserManager.executeJavaScript() → 执行页面脚本`);
      const result = await this.executeJavaScript(script);
      logger.info(`🔗 [调用链追踪] Step 8: JavaScript执行完成`, { hasResult: !!result });
      
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('执行页面脚本失败:', error);
      return { success: false, error: errorMessage };
    }
  }

  public showWindow(): void {
    if (this.weiboWindow) {
      this.weiboWindow.show();
      this.weiboWindow.focus();
      logger.info('显示微博浏览器窗口');
    }
  }

  // ==================== Playwright支持方法 ====================

  /**
   * 获取Playwright浏览器上下文
   */
  public async getBrowserContext(): Promise<BrowserContext> {
    if (!this.playwrightContext) {
      await this.initializePlaywright();
    }
    return this.playwrightContext!;
  }

  /**
   * 获取Playwright页面
   */
  public async getPage(): Promise<Page> {
    if (!this.playwrightContext) {
      await this.initializePlaywright();
    }
    return await this.playwrightContext!.newPage();
  }

  /**
   * 初始化Playwright浏览器
   */
  private async initializePlaywright(): Promise<void> {
    try {
      logger.logWeiboOperation('初始化Playwright浏览器');

      // 启动Chromium浏览器
      this.playwrightBrowser = await chromium.launch({
        headless: false, // 显示浏览器窗口
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      // 获取配置
      const config = configManager.getConfig();
      
      // 创建浏览器上下文
      this.playwrightContext = await this.playwrightBrowser.newContext({
        userAgent: config.weibo.userAgent,
        viewport: {
          width: config.weibo.browserFingerprint.viewport.width,
          height: config.weibo.browserFingerprint.viewport.height
        },
        locale: config.weibo.browserFingerprint.locale,
        timezoneId: config.weibo.browserFingerprint.timezone,
        geolocation: config.weibo.browserFingerprint.geolocation,
        permissions: ['geolocation']
      });

      logger.logWeiboOperation('Playwright浏览器初始化完成');
    } catch (error) {
      logger.error('Playwright浏览器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 清理Playwright资源
   */
  public async cleanupPlaywright(): Promise<void> {
    try {
      if (this.playwrightContext) {
        await this.playwrightContext.close();
        this.playwrightContext = null;
      }
      
      if (this.playwrightBrowser) {
        await this.playwrightBrowser.close();
        this.playwrightBrowser = null;
      }
      
      logger.logWeiboOperation('Playwright资源清理完成');
    } catch (error) {
      logger.error('Playwright资源清理失败:', error);
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

  public getInitializationStatus(): boolean {
    return this.isInitialized;
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
