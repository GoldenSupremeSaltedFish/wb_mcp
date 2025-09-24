import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import * as path from 'path';
import { configManager } from '../utils/config';
import { logger } from '../utils/logger';
import { mcpServer } from '../mcpserver/server';

class WeiboMCPApp {
  private mainWindow: BrowserWindow | null = null;
  private hiddenWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private isQuitting = false;

  constructor() {
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      // 等待 Electron 准备就绪
      await app.whenReady();

      // 初始化配置管理器
      await configManager.initialize();

      // 创建主窗口（隐藏）
      this.createMainWindow();

      // 创建隐藏的微博浏览器窗口
      this.createHiddenWindow();

      // 创建系统托盘
      this.createTray();

      // 启动 MCP 服务器
      await this.startMCPServer();

      // 设置应用事件监听
      this.setupAppEvents();

      logger.info('微博 MCP 应用初始化完成');
    } catch (error) {
      logger.error('应用初始化失败:', error);
      app.quit();
    }
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false, // 默认隐藏
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // 加载配置管理界面
    this.mainWindow.loadFile('src/renderer/index.html');

    this.mainWindow.on('close', (event: any) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private createHiddenWindow(): void {
    const config = configManager.getWeiboConfig();
    
    this.hiddenWindow = new BrowserWindow({
      width: config.browserFingerprint.viewport.width,
      height: config.browserFingerprint.viewport.height,
      show: false, // 隐藏运行
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // 设置用户代理
    if (config.userAgent) {
      this.hiddenWindow.webContents.setUserAgent(config.userAgent);
    }

    // 加载微博页面
    this.hiddenWindow.loadURL('https://weibo.com');

    // 监听页面导航事件
    this.hiddenWindow.webContents.on('did-navigate', (_event: any, url: string) => {
      logger.info('微博页面导航到:', url);
      this.handleWeiboNavigation(url);
    });

    this.hiddenWindow.webContents.on('did-navigate-in-page', (_event: any, url: string) => {
      logger.info('微博页面内导航到:', url);
      this.handleWeiboNavigation(url);
    });

    this.hiddenWindow.on('closed', () => {
      this.hiddenWindow = null;
    });
  }

  private createTray(): void {
    // 创建托盘图标
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    
    this.tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          this.mainWindow?.show();
        },
      },
      {
        label: '显示微博窗口',
        click: () => {
          this.hiddenWindow?.show();
        },
      },
      { type: 'separator' },
      {
        label: 'MCP 服务状态',
        submenu: [
          {
            label: '启动服务',
            click: () => this.startMCPServer(),
          },
          {
            label: '停止服务',
            click: () => this.stopMCPServer(),
          },
        ],
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('微博 MCP 服务');
  }

  private async startMCPServer(): Promise<void> {
    try {
      await mcpServer.start();
      logger.info('MCP 服务器启动成功');
    } catch (error) {
      logger.error('MCP 服务器启动失败:', error);
    }
  }

  private async stopMCPServer(): Promise<void> {
    try {
      await mcpServer.stop();
      logger.info('MCP 服务器已停止');
    } catch (error) {
      logger.error('停止 MCP 服务器失败:', error);
    }
  }

  private handleWeiboNavigation(url: string): void {
    // 检测登录状态
    if (url.includes('login') || url.includes('passport')) {
      logger.warn('检测到登录页面，可能需要用户手动登录');
      // 可以在这里显示登录窗口
    }

    // 检测验证码
    if (url.includes('captcha') || url.includes('verify')) {
      logger.warn('检测到验证码页面');
      // 显示验证码处理窗口
      this.hiddenWindow?.show();
    }
  }

  private setupAppEvents(): void {
    app.on('window-all-closed', () => {
      // 在 macOS 上，应用通常保持活跃状态
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      // 在 macOS 上，当点击 dock 图标时重新创建窗口
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.on('before-quit', () => {
      this.isQuitting = true;
    });
  }
}

// 启动应用
new WeiboMCPApp();
