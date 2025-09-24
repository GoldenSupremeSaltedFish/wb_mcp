import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { ConfigTemplateManager } from './config-templates';

export interface BrowserFingerprint {
  locale: string;
  timezone: string;
  timezoneOffset: number;
  geolocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  viewport: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  platform: string;
  languages: string[];
}

export interface UserBehavior {
  minWaitTime: number;
  maxWaitTime: number;
  simulateMouseMove: boolean;
  simulateFocus: boolean;
  simulateScroll: boolean;
  randomDelay: boolean;
}

export interface WeiboConfig {
  accessToken?: string;
  cookie?: string;
  userAgent: string;
  rateLimit: number;
  requestInterval: number;
  browserFingerprint: BrowserFingerprint;
  userBehavior: UserBehavior;
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
        userAgent: process.env['WEIBO_USER_AGENT'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        rateLimit: parseInt(process.env['REQUEST_RATE_LIMIT'] || '10'),
        requestInterval: parseInt(process.env['REQUEST_INTERVAL_MS'] || '1000'),
        browserFingerprint: {
          locale: process.env['BROWSER_LOCALE'] || 'zh-CN',
          timezone: process.env['BROWSER_TIMEZONE'] || 'Asia/Shanghai',
          timezoneOffset: parseInt(process.env['BROWSER_TIMEZONE_OFFSET'] || '-480'),
          geolocation: {
            latitude: parseFloat(process.env['BROWSER_LATITUDE'] || '39.9042'),
            longitude: parseFloat(process.env['BROWSER_LONGITUDE'] || '116.4074'),
            accuracy: parseInt(process.env['BROWSER_ACCURACY'] || '100'),
          },
          viewport: {
            width: parseInt(process.env['BROWSER_VIEWPORT_WIDTH'] || '1920'),
            height: parseInt(process.env['BROWSER_VIEWPORT_HEIGHT'] || '1080'),
          },
          screen: {
            width: parseInt(process.env['BROWSER_SCREEN_WIDTH'] || '1920'),
            height: parseInt(process.env['BROWSER_SCREEN_HEIGHT'] || '1080'),
            colorDepth: parseInt(process.env['BROWSER_COLOR_DEPTH'] || '24'),
          },
          platform: process.env['BROWSER_PLATFORM'] || 'Win32',
          languages: (process.env['BROWSER_LANGUAGES'] || 'zh-CN,zh,en-US,en').split(','),
        },
        userBehavior: {
          minWaitTime: parseInt(process.env['USER_MIN_WAIT_TIME'] || '2000'),
          maxWaitTime: parseInt(process.env['USER_MAX_WAIT_TIME'] || '5000'),
          simulateMouseMove: process.env['USER_SIMULATE_MOUSE'] !== 'false',
          simulateFocus: process.env['USER_SIMULATE_FOCUS'] !== 'false',
          simulateScroll: process.env['USER_SIMULATE_SCROLL'] !== 'false',
          randomDelay: process.env['USER_RANDOM_DELAY'] !== 'false',
        },
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

  public async applyTemplate(templateId: string): Promise<boolean> {
    try {
      const template = ConfigTemplateManager.getTemplate(templateId);
      if (!template) {
        logger.error(`模板 "${templateId}" 不存在`);
        return false;
      }

      // 应用模板配置
      this.config.weibo.userAgent = template.userAgent;
      this.config.weibo.browserFingerprint = template.browserFingerprint;
      this.config.weibo.userBehavior = template.userBehavior;

      // 保存配置
      await this.saveConfig();
      
      logger.info(`已应用模板: ${template.name}`);
      return true;
    } catch (error) {
      logger.error('应用模板失败:', error);
      return false;
    }
  }

  public getAvailableTemplates(): Array<{id: string, name: string, description: string, category: string}> {
    return ConfigTemplateManager.getAllTemplates().map(template => ({
      id: this.getTemplateId(template),
      name: template.name,
      description: template.description,
      category: template.category
    }));
  }

  public getCurrentTemplateId(): string | null {
    const config = this.config.weibo;
    
    // 根据当前配置匹配模板
    const templates = ConfigTemplateManager.getAllTemplates();
    for (const template of templates) {
      if (this.isConfigMatchingTemplate(config, template)) {
        return this.getTemplateId(template);
      }
    }
    
    return null;
  }

  private getTemplateId(template: any): string {
    const idMap: Record<string, string> = {
      '普通桌面用户': 'desktop_normal',
      '高分辨率桌面用户': 'desktop_high_res',
      'Android移动用户': 'mobile_android',
      'iOS移动用户': 'mobile_ios',
      '企业用户': 'enterprise_user',
      '隐身模式': 'stealth_mode',
      '快速模式': 'fast_mode'
    };
    
    return idMap[template.name] || 'custom';
  }

  private isConfigMatchingTemplate(config: WeiboConfig, template: any): boolean {
    return (
      config.userAgent === template.userAgent &&
      config.browserFingerprint.locale === template.browserFingerprint.locale &&
      config.browserFingerprint.timezone === template.browserFingerprint.timezone &&
      config.browserFingerprint.viewport.width === template.browserFingerprint.viewport.width &&
      config.browserFingerprint.viewport.height === template.browserFingerprint.viewport.height &&
      config.userBehavior.minWaitTime === template.userBehavior.minWaitTime &&
      config.userBehavior.maxWaitTime === template.userBehavior.maxWaitTime
    );
  }
}

export const configManager = new ConfigManager();
