import { Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface ActionSequence {
  type: 'click' | 'input' | 'scroll' | 'wait';
  selector?: string;
  value?: string;
  duration?: number;
}

export interface RequestLog {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | undefined;
  timestamp: number;
  response?: {
    status: number;
    headers: Record<string, string>;
    body?: string;
  };
}

export class SimpleHARObserver {
  private requests: RequestLog[] = [];
  private page: Page | null = null;

  constructor() {
    this.requests = [];
  }

  /**
   * 初始化页面并设置请求拦截
   */
  public async initialize(context: BrowserContext): Promise<void> {
    this.page = await context.newPage();
    
    // 设置请求拦截
    await this.setupRequestInterception();
    
    logger.logWeiboOperation('HAR观测器初始化完成');
  }

  /**
   * 设置请求拦截
   */
  private async setupRequestInterception(): Promise<void> {
    if (!this.page) return;

    // 拦截所有请求
    this.page.on('request', (request) => {
      const requestLog: RequestLog = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        body: request.postData() || undefined,
        timestamp: Date.now()
      };
      
      this.requests.push(requestLog);
      
      logger.logWeiboOperation('捕获请求', {
        url: request.url(),
        method: request.method()
      });
    });
  }

  /**
   * 执行动作序列并观测请求
   */
  public async observeActions(url: string, actionSequence: ActionSequence[]): Promise<{
    harFile: string;
    requestLogs: RequestLog[];
  }> {
    if (!this.page) {
      throw new Error('页面未初始化');
    }

    logger.logWeiboOperation('开始观测动作序列', { 
      url, 
      actionCount: actionSequence.length 
    });

    // 导航到目标页面
    await this.page.goto(url, { waitUntil: 'networkidle' });
    
    // 执行动作序列
    for (const action of actionSequence) {
      await this.executeAction(action);
    }

    // 等待所有请求完成
    await this.page.waitForTimeout(2000);

    // 生成HAR文件
    const harFile = await this.generateHAR();
    
    // 保存请求日志
    const requestLogs = [...this.requests];
    
    logger.logWeiboOperation('动作序列观测完成', {
      harFile,
      requestCount: requestLogs.length
    });

    return {
      harFile,
      requestLogs
    };
  }

  /**
   * 执行单个动作
   */
  private async executeAction(action: ActionSequence): Promise<void> {
    if (!this.page) return;

    switch (action.type) {
      case 'click':
        if (action.selector) {
          await this.page.click(action.selector);
          logger.logWeiboOperation('执行点击动作', { selector: action.selector });
        }
        break;
        
      case 'input':
        if (action.selector && action.value) {
          await this.page.fill(action.selector, action.value);
          logger.logWeiboOperation('执行输入动作', { 
            selector: action.selector, 
            valueLength: action.value.length 
          });
        }
        break;
        
      case 'scroll':
        await this.page.evaluate(() => {
          window.scrollBy(0, 500);
        });
        logger.logWeiboOperation('执行滚动动作');
        break;
        
      case 'wait':
        await this.page.waitForTimeout(action.duration || 1000);
        logger.logWeiboOperation('执行等待动作', { duration: action.duration });
        break;
    }
  }

  /**
   * 生成HAR文件
   */
  private async generateHAR(): Promise<string> {
    if (!this.page) {
      throw new Error('页面未初始化');
    }

    const harFile = path.join(process.cwd(), 'data', `har-${Date.now()}.har`);
    
    // 确保数据目录存在
    const dataDir = path.dirname(harFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 创建简单的HAR文件
    const harData = {
      log: {
        version: "1.2",
        creator: {
          name: "Weibo MCP HAR Observer",
          version: "1.0.0"
        },
        entries: this.requests.map(req => ({
          request: {
            method: req.method,
            url: req.url,
            headers: Object.entries(req.headers).map(([name, value]) => ({ name, value })),
            postData: req.body ? { text: req.body } : undefined
          },
          response: req.response ? {
            status: req.response.status,
            statusText: "OK",
            headers: Object.entries(req.response.headers).map(([name, value]) => ({ name, value })),
            content: req.response.body ? { text: req.response.body } : undefined
          } : undefined,
          startedDateTime: new Date(req.timestamp).toISOString()
        }))
      }
    };

    fs.writeFileSync(harFile, JSON.stringify(harData, null, 2));
    
    logger.logWeiboOperation('HAR文件生成完成', { harFile });
    return harFile;
  }

  /**
   * 获取请求列表
   */
  public getRequestLogs(): RequestLog[] {
    return [...this.requests];
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    this.requests = [];
    logger.logWeiboOperation('HAR观测器清理完成');
  }
}
