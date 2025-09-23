import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private logLevel: LogLevel;
  private logFile: string;

  constructor() {
    this.logLevel = this.parseLogLevel(process.env['LOG_LEVEL'] || 'info');
    this.logFile = process.env['LOG_FILE'] || 'logs/wb_mcp.log';
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
  }

  private writeToFile(message: string): void {
    try {
      // 确保日志目录存在
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // 写入日志文件
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (error) {
      // 如果写入文件失败，至少输出到控制台
      console.error('写入日志文件失败:', error);
    }
  }

  private log(level: LogLevel, levelName: string, message: string, ...args: any[]): void {
    if (level < this.logLevel) {
      return;
    }

    const formattedMessage = this.formatMessage(levelName, message, ...args);
    
    // 输出到控制台
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }

    // 写入日志文件
    this.writeToFile(formattedMessage);
  }

  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, 'debug', message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, 'info', message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, 'warn', message, ...args);
  }

  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, 'error', message, ...args);
  }

  public setLogLevel(level: string): void {
    this.logLevel = this.parseLogLevel(level);
  }

  public getLogLevel(): string {
    switch (this.logLevel) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
        return 'error';
      default:
        return 'info';
    }
  }

  // 记录 API 请求
  public logApiRequest(method: string, url: string, status?: number, duration?: number): void {
    const message = `API ${method} ${url}`;
    const args = [];
    
    if (status !== undefined) {
      args.push(`status: ${status}`);
    }
    
    if (duration !== undefined) {
      args.push(`duration: ${duration}ms`);
    }

    this.info(message, ...args);
  }

  // 记录错误重试
  public logRetry(operation: string, attempt: number, maxAttempts: number, error: any): void {
    this.warn(`重试 ${operation}`, `尝试 ${attempt}/${maxAttempts}`, error);
  }

  // 记录微博相关操作
  public logWeiboOperation(operation: string, details?: any): void {
    this.info(`微博操作: ${operation}`, details);
  }

  // 记录 MCP 服务操作
  public logMCPService(operation: string, details?: any): void {
    this.info(`MCP 服务: ${operation}`, details);
  }
}

export const logger = new Logger();
