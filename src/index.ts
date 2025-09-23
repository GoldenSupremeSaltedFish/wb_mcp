#!/usr/bin/env node

// 微博 MCP 服务入口文件
import { configManager } from './utils/config';
import { logger } from './utils/logger';
import { mcpServer } from './mcpserver/server';

async function main(): Promise<void> {
  try {
    logger.info('启动微博 MCP 服务...');
    
    // 初始化配置
    await configManager.initialize();
    
    // 启动 MCP 服务器
    await mcpServer.start();
    
    logger.info('微博 MCP 服务启动成功！');
    logger.info('服务信息:', mcpServer.getServerInfo());
    
    // 保持进程运行
    process.stdin.resume();
    
  } catch (error) {
    logger.error('启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  logger.info('收到关闭信号，正在停止服务...');
  try {
    await mcpServer.stop();
    logger.info('服务已停止');
    process.exit(0);
  } catch (error) {
    logger.error('停止服务时出错:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('收到终止信号，正在停止服务...');
  try {
    await mcpServer.stop();
    logger.info('服务已停止');
    process.exit(0);
  } catch (error) {
    logger.error('停止服务时出错:', error);
    process.exit(1);
  }
});

// 启动应用
main().catch((error) => {
  logger.error('应用启动失败:', error);
  process.exit(1);
});
