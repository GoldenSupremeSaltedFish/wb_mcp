import { Page } from 'playwright';
import { logger } from '../utils/logger';

export interface RequestSample {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ReplayResult {
  success: boolean;
  response?: {
    status: number;
    headers: Record<string, string>;
    body?: string;
  };
  error?: string;
  pageChanges?: {
    title?: string | undefined;
    url?: string | undefined;
    elementCount?: number | undefined;
  };
}

export class RequestReplayer {
  private page: Page | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 在页面上下文中重放请求
   */
  public async replayRequest(requestSample: RequestSample): Promise<ReplayResult> {
    if (!this.page) {
      throw new Error('页面未初始化');
    }

    logger.logWeiboOperation('开始重放请求', {
      url: requestSample.url,
      method: requestSample.method
    });

    try {
      // 在页面上下文中执行重放
      const result = await this.page.evaluate(async (sample) => {
        try {
          // 记录页面状态（重放前）
          const beforeState = {
            title: document.title,
            url: window.location.href,
            elementCount: document.querySelectorAll('*').length
          };

          // 构建请求选项
          const requestOptions: RequestInit = {
            method: sample.method,
            headers: sample.headers,
            credentials: 'include', // 包含cookies
            mode: 'cors'
          };

          if (sample.body) {
            requestOptions.body = sample.body;
          }

          // 执行请求
          const response = await fetch(sample.url, requestOptions);
          
          // 获取响应数据
          const responseText = await response.text();
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          // 记录页面状态（重放后）
          const afterState = {
            title: document.title,
            url: window.location.href,
            elementCount: document.querySelectorAll('*').length
          };

          return {
            success: true,
            response: {
              status: response.status,
              headers: responseHeaders,
              body: responseText
            },
            pageChanges: {
              title: afterState.title !== beforeState.title ? afterState.title : undefined,
              url: afterState.url !== beforeState.url ? afterState.url : undefined,
              elementCount: afterState.elementCount !== beforeState.elementCount ? afterState.elementCount : undefined
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          };
        }
      }, requestSample);

      logger.logWeiboOperation('请求重放完成', {
        success: result.success,
        status: result.response?.status,
        hasPageChanges: !!result.pageChanges
      });

      return result;
    } catch (error) {
      logger.error('请求重放失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 批量重放请求
   */
  public async replayRequests(requestSamples: RequestSample[]): Promise<ReplayResult[]> {
    const results: ReplayResult[] = [];
    
    for (const sample of requestSamples) {
      const result = await this.replayRequest(sample);
      results.push(result);
      
      // 请求间添加延迟，避免过于频繁
      await this.page?.waitForTimeout(1000);
    }

    logger.logWeiboOperation('批量请求重放完成', {
      total: requestSamples.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * 使用页面内函数重放请求
   */
  public async replayWithPageFunction(functionName: string, ...args: any[]): Promise<ReplayResult> {
    if (!this.page) {
      throw new Error('页面未初始化');
    }

    logger.logWeiboOperation('使用页面函数重放', { functionName, argsCount: args.length });

    try {
      const result = await this.page.evaluate(async ({ fnName, fnArgs }: { fnName: string, fnArgs: any[] }) => {
        try {
          // 检查函数是否存在
          const fn = (window as any)[fnName];
          if (typeof fn !== 'function') {
            return {
              success: false,
              error: `页面函数 ${fnName} 不存在或不是函数`
            };
          }

          // 记录页面状态（重放前）
          const beforeState = {
            title: document.title,
            url: window.location.href,
            elementCount: document.querySelectorAll('*').length
          };

          // 执行页面函数
          const response = await fn(...fnArgs);

          // 记录页面状态（重放后）
          const afterState = {
            title: document.title,
            url: window.location.href,
            elementCount: document.querySelectorAll('*').length
          };

          return {
            success: true,
            response: {
              status: 200,
              headers: {},
              body: JSON.stringify(response)
            },
            pageChanges: {
              title: afterState.title !== beforeState.title ? afterState.title : undefined,
              url: afterState.url !== beforeState.url ? afterState.url : undefined,
              elementCount: afterState.elementCount !== beforeState.elementCount ? afterState.elementCount : undefined
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          };
        }
      }, { fnName: functionName, fnArgs: args });

      logger.logWeiboOperation('页面函数重放完成', {
        success: result.success,
        hasPageChanges: !!result.pageChanges
      });

      return result as ReplayResult;
    } catch (error) {
      logger.error('页面函数重放失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 观察页面变化
   */
  public async observePageChanges(duration: number = 5000): Promise<{
    title: string;
    url: string;
    elementCount: number;
    networkRequests: number;
  }> {
    if (!this.page) {
      throw new Error('页面未初始化');
    }

    const initialState = await this.page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      elementCount: document.querySelectorAll('*').length
    }));

    // 等待指定时间
    await this.page.waitForTimeout(duration);

    const finalState = await this.page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      elementCount: document.querySelectorAll('*').length
    }));

    logger.logWeiboOperation('页面变化观察完成', {
      duration,
      titleChanged: finalState.title !== initialState.title,
      urlChanged: finalState.url !== initialState.url,
      elementCountChanged: finalState.elementCount !== initialState.elementCount
    });

    return {
      title: finalState.title,
      url: finalState.url,
      elementCount: finalState.elementCount,
      networkRequests: 0 // 这个需要从网络拦截器获取
    };
  }
}
