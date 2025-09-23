import { logger } from './logger';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

class ErrorRecovery {
  private defaultOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  public async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const config = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    let lastError: any;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        const totalTime = Date.now() - startTime;
        
        if (attempt > 0) {
          logger.info('操作重试成功', { 
            attempt: attempt + 1, 
            totalTime,
            operation: operation.name || 'unknown'
          });
        }

        return {
          success: true,
          result,
          attempts: attempt + 1,
          totalTime,
        };
      } catch (error) {
        lastError = error;
        
        // 检查是否应该重试
        if (attempt === config.maxRetries || !this.shouldRetry(error, config)) {
          break;
        }

        const delay = this.calculateDelay(attempt, config);
        logger.logRetry('操作重试', attempt + 1, config.maxRetries + 1, error);
        
        await this.sleep(delay);
      }
    }

    const totalTime = Date.now() - startTime;
    logger.error('操作最终失败', { 
      attempts: config.maxRetries + 1, 
      totalTime,
      error: lastError,
      operation: operation.name || 'unknown'
    });

    return {
      success: false,
      error: lastError,
      attempts: config.maxRetries + 1,
      totalTime,
    };
  }

  private shouldRetry(error: any, options: RetryOptions): boolean {
    // 如果提供了自定义重试条件，使用它
    if (options.retryCondition) {
      return options.retryCondition(error);
    }

    // 默认重试条件
    if (error.code) {
      // 网络错误
      if (['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code)) {
        return true;
      }
      
      // HTTP 状态码
      if (error.response?.status) {
        const status = error.response.status;
        // 5xx 服务器错误和 429 限流错误
        return status >= 500 || status === 429;
      }
    }

    // 微博特定的错误
    if (error.message) {
      const message = error.message.toLowerCase();
      if (message.includes('rate limit') || 
          message.includes('too many requests') ||
          message.includes('network error') ||
          message.includes('timeout')) {
        return true;
      }
    }

    return false;
  }

  private calculateDelay(attempt: number, options: RetryOptions): number {
    const delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt);
    return Math.min(delay, options.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 网络请求重试
  public async retryNetworkRequest<T>(
    requestFn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    return this.withRetry(requestFn, {
      ...options,
      retryCondition: (error) => {
        // 网络请求特定的重试条件
        if (error.code) {
          return ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code);
        }
        
        if (error.response?.status) {
          const status = error.response.status;
          return status >= 500 || status === 429 || status === 408;
        }
        
        return false;
      },
    });
  }

  // 浏览器操作重试
  public async retryBrowserOperation<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    return this.withRetry(operation, {
      ...options,
      retryCondition: (error) => {
        // 浏览器操作特定的重试条件
        if (error.message) {
          const message = error.message.toLowerCase();
          return message.includes('timeout') ||
                 message.includes('navigation') ||
                 message.includes('script') ||
                 message.includes('element not found');
        }
        return false;
      },
    });
  }

  // 微博 API 重试
  public async retryWeiboAPI<T>(
    apiCall: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    return this.withRetry(apiCall, {
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      ...options,
      retryCondition: (error) => {
        // 微博 API 特定的重试条件
        if (error.response?.status) {
          const status = error.response.status;
          // 限流、服务器错误、网络错误
          return status === 429 || status >= 500 || status === 408;
        }
        
        if (error.message) {
          const message = error.message.toLowerCase();
          return message.includes('rate limit') ||
                 message.includes('too many requests') ||
                 message.includes('network') ||
                 message.includes('timeout') ||
                 message.includes('captcha') ||
                 message.includes('verification');
        }
        
        return false;
      },
    });
  }

  // 创建指数退避延迟
  public createBackoffDelay(attempt: number, baseDelay = 1000, maxDelay = 30000): number {
    const delay = baseDelay * Math.pow(2, attempt);
    return Math.min(delay, maxDelay);
  }

  // 创建随机延迟（避免雷群效应）
  public createJitteredDelay(baseDelay: number, jitterFactor = 0.1): number {
    const jitter = baseDelay * jitterFactor * Math.random();
    return baseDelay + jitter;
  }

  // 检查错误类型
  public classifyError(error: any): {
    type: 'network' | 'http' | 'timeout' | 'rate_limit' | 'auth' | 'unknown';
    retryable: boolean;
    message: string;
  } {
    if (error.code) {
      if (['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED'].includes(error.code)) {
        return { type: 'network', retryable: true, message: '网络连接错误' };
      }
      if (error.code === 'ETIMEDOUT') {
        return { type: 'timeout', retryable: true, message: '请求超时' };
      }
    }

    if (error.response?.status) {
      const status = error.response.status;
      if (status === 429) {
        return { type: 'rate_limit', retryable: true, message: '请求频率限制' };
      }
      if (status === 401 || status === 403) {
        return { type: 'auth', retryable: false, message: '认证失败' };
      }
      if (status >= 500) {
        return { type: 'http', retryable: true, message: '服务器错误' };
      }
    }

    if (error.message) {
      const message = error.message.toLowerCase();
      if (message.includes('rate limit') || message.includes('too many requests')) {
        return { type: 'rate_limit', retryable: true, message: '请求频率限制' };
      }
      if (message.includes('timeout')) {
        return { type: 'timeout', retryable: true, message: '请求超时' };
      }
      if (message.includes('auth') || message.includes('login')) {
        return { type: 'auth', retryable: false, message: '认证失败' };
      }
    }

    return { type: 'unknown', retryable: false, message: error.message || '未知错误' };
  }
}

export const errorRecovery = new ErrorRecovery();
