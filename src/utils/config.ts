import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export interface WeiboConfig {
  accessToken?: string;
  cookie?: string;
  userAgent: string;
  rateLimit: number;
  requestInterval: number;
}

export interface MCPConfig {
  port: number;
  host: string;
}

export interface AppConfig {
  weibo: WeiboConfig;
  mcp: MCPConfig;
  logLevel: string;
  logFile: string;
  dataDir: string;
  exportDir: string;
}

class ConfigManager {
  private config: AppConfig;
  private configPath: string;

  constructor() {
    this.configPath = this.getConfigPath();
    this.config = this.getDefaultConfig();
  }

  private getConfigPath(): string {
    // 使用当前工作目录下的 config 目录
    return path.join(process.cwd(), 'config', 'config.json');
  }

  private getDefaultConfig(): AppConfig {
    return {
      weibo: {
        accessToken: process.env['WEIBO_ACCESS_TOKEN'] || '',
        cookie: process.env['WEIBO_COOKIE'] || '',
        userAgent: process.env['WEIBO_USER_AGENT'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        rateLimit: parseInt(process.env['REQUEST_RATE_LIMIT'] || '10'),
        requestInterval: parseInt(process.env['REQUEST_INTERVAL_MS'] || '1000'),
      },
      mcp: {
        port: parseInt(process.env['MCP_SERVER_PORT'] || '3000'),
        host: process.env['MCP_SERVER_HOST'] || 'localhost',
      },
      logLevel: process.env['LOG_LEVEL'] || 'info',
      logFile: process.env['LOG_FILE'] || 'logs/wb_mcp.log',
      dataDir: process.env['DATA_DIR'] || './data',
      exportDir: process.env['EXPORT_DIR'] || './exports',
    };
  }

  public async initialize(): Promise<void> {
    try {
      // 确保配置目录存在
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 加载现有配置或创建默认配置
      if (fs.existsSync(this.configPath)) {
        await this.loadConfig();
      } else {
        await this.saveConfig();
      }

      // 确保数据目录存在
      await this.ensureDirectories();

      logger.info('配置管理器初始化完成');
    } catch (error) {
      logger.error('配置管理器初始化失败:', error);
      throw error;
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(configData);
      
      // 合并默认配置和加载的配置
      this.config = { ...this.getDefaultConfig(), ...loadedConfig };
      
      logger.info('配置加载成功');
    } catch (error) {
      logger.warn('配置加载失败，使用默认配置:', error);
      this.config = this.getDefaultConfig();
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      logger.info('配置保存成功');
    } catch (error) {
      logger.error('配置保存失败:', error);
      throw error;
    }
  }

  private async ensureDirectories(): Promise<void> {
    const directories = [
      this.config.dataDir,
      this.config.exportDir,
      path.dirname(this.config.logFile),
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`创建目录: ${dir}`);
      }
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public getWeiboConfig(): WeiboConfig {
    return { ...this.config.weibo };
  }

  public getMCPConfig(): MCPConfig {
    return { ...this.config.mcp };
  }

  public async updateWeiboConfig(updates: Partial<WeiboConfig>): Promise<void> {
    this.config.weibo = { ...this.config.weibo, ...updates };
    await this.saveConfig();
    logger.info('微博配置已更新');
  }

  public async updateMCPConfig(updates: Partial<MCPConfig>): Promise<void> {
    this.config.mcp = { ...this.config.mcp, ...updates };
    await this.saveConfig();
    logger.info('MCP 配置已更新');
  }

  public async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
    logger.info('应用配置已更新');
  }

  public isWeiboAuthenticated(): boolean {
    return !!(this.config.weibo.accessToken || this.config.weibo.cookie);
  }

  public getDataPath(filename?: string): string {
    return filename ? path.join(this.config.dataDir, filename) : this.config.dataDir;
  }

  public getExportPath(filename?: string): string {
    return filename ? path.join(this.config.exportDir, filename) : this.config.exportDir;
  }
}

export const configManager = new ConfigManager();
