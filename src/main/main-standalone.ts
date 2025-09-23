// 独立版本的主程序，不依赖 Electron
import { configManager } from '../utils/config';
import { logger } from '../utils/logger';
import { mcpServer } from '../mcpserver/server';

class WeiboMCPApp {
  private isRunning = false;

  constructor() {
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      // 初始化配置管理器
      await configManager.initialize();

      // 启动 MCP 服务器
      await this.startMCPServer();

      // 设置进程事件监听
      this.setupProcessEvents();

      this.isRunning = true;
      logger.info('微博 MCP 应用初始化完成（独立模式）');
    } catch (error) {
      logger.error('应用初始化失败:', error);
      process.exit(1);
    }
  }

  private async startMCPServer(): Promise<void> {
    try {
      await mcpServer.start();
      logger.info('MCP 服务器启动成功');
    } catch (error) {
      logger.error('MCP 服务器启动失败:', error);
      throw error;
    }
  }

  private setupProcessEvents(): void {
    process.on('SIGINT', async () => {
      logger.info('收到 SIGINT 信号，正在关闭应用...');
      await this.shutdown();
    });

    process.on('SIGTERM', async () => {
      logger.info('收到 SIGTERM 信号，正在关闭应用...');
      await this.shutdown();
    });

    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      this.shutdown().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, _promise) => {
      logger.error('未处理的 Promise 拒绝:', reason);
      this.shutdown().then(() => process.exit(1));
    });
  }

  private async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await mcpServer.stop();
      logger.info('应用已安全关闭');
      this.isRunning = false;
    } catch (error) {
      logger.error('关闭应用时出错:', error);
    }
  }

  public isAppRunning(): boolean {
    return this.isRunning;
  }
}

// 启动应用
new WeiboMCPApp();
