import { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';
import { browserManager } from './browser-manager';

export interface CaptchaInfo {
  type: 'image' | 'slider' | 'sms' | 'email' | 'unknown';
  url?: string;
  challenge?: string;
  message: string;
  timestamp: number;
}

export interface CaptchaResult {
  success: boolean;
  solved: boolean;
  token?: string;
  error?: string;
}

class CaptchaHandler {
  private captchaWindow: BrowserWindow | null = null;
  private isHandling = false;
  private currentCaptcha: CaptchaInfo | null = null;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 监听浏览器导航事件，检测验证码页面
    // 这里可以通过事件总线或其他方式接收来自 browserManager 的事件
  }

  public async handleCaptcha(captchaInfo: CaptchaInfo): Promise<CaptchaResult> {
    if (this.isHandling) {
      logger.warn('已有验证码正在处理中');
      return { success: false, solved: false, error: '已有验证码正在处理中' };
    }

    this.isHandling = true;
    this.currentCaptcha = captchaInfo;

    try {
      logger.info('开始处理验证码', captchaInfo);

      // 显示微博浏览器窗口让用户手动处理
      browserManager.showWindow();

      // 创建验证码处理窗口
      await this.createCaptchaWindow(captchaInfo);

      // 等待用户处理验证码
      const result = await this.waitForCaptchaResolution();

      logger.info('验证码处理完成', result);
      return result;

    } catch (error) {
      logger.error('验证码处理失败:', error);
      return {
        success: false,
        solved: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    } finally {
      this.isHandling = false;
      this.currentCaptcha = null;
      this.closeCaptchaWindow();
    }
  }

  private async createCaptchaWindow(captchaInfo: CaptchaInfo): Promise<void> {
    this.captchaWindow = new BrowserWindow({
      width: 400,
      height: 300,
      show: false,
      modal: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // 设置窗口标题
    this.captchaWindow.setTitle('验证码处理 - 微博 MCP');

    // 加载验证码处理页面
    const html = this.generateCaptchaHTML(captchaInfo);
    await this.captchaWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // 显示窗口
    this.captchaWindow.show();
    this.captchaWindow.focus();

    // 监听窗口关闭
    this.captchaWindow.on('closed', () => {
      this.captchaWindow = null;
    });
  }

  private generateCaptchaHTML(captchaInfo: CaptchaInfo): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>验证码处理</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            box-sizing: border-box;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 350px;
            width: 100%;
        }
        .icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #333;
        }
        .message {
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .instructions {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #495057;
        }
        .button {
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
            margin: 5px;
            transition: background 0.2s;
        }
        .button:hover {
            background: #0056b3;
        }
        .button.secondary {
            background: #6c757d;
        }
        .button.secondary:hover {
            background: #545b62;
        }
        .status {
            margin-top: 15px;
            font-size: 12px;
            color: #28a745;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔐</div>
        <div class="title">需要验证码验证</div>
        <div class="message">${this.getCaptchaMessage(captchaInfo)}</div>
        
        <div class="instructions">
            <strong>处理步骤：</strong><br>
            1. 在微博浏览器窗口中完成验证码<br>
            2. 验证成功后点击"已完成"按钮<br>
            3. 系统将自动继续执行任务
        </div>
        
        <button class="button" onclick="markCompleted()">✅ 已完成验证</button>
        <button class="button secondary" onclick="skipCaptcha()">⏭️ 跳过验证</button>
        
        <div class="status" id="status"></div>
    </div>

    <script>
        function markCompleted() {
            document.getElementById('status').textContent = '验证完成，正在继续...';
            // 通知主进程验证完成
            if (window.electronAPI) {
                window.electronAPI.captchaCompleted();
            }
        }
        
        function skipCaptcha() {
            document.getElementById('status').textContent = '跳过验证，任务可能失败';
            // 通知主进程跳过验证
            if (window.electronAPI) {
                window.electronAPI.captchaSkipped();
            }
        }
        
        // 自动检测验证码完成（可选）
        function checkCaptchaStatus() {
            // 这里可以添加自动检测逻辑
        }
        
        // 每5秒检查一次状态
        setInterval(checkCaptchaStatus, 5000);
    </script>
</body>
</html>`;
  }

  private getCaptchaMessage(captchaInfo: CaptchaInfo): string {
    switch (captchaInfo.type) {
      case 'image':
        return '检测到图片验证码，请在微博浏览器窗口中输入验证码。';
      case 'slider':
        return '检测到滑块验证码，请在微博浏览器窗口中完成滑块验证。';
      case 'sms':
        return '检测到短信验证码，请输入收到的验证码。';
      case 'email':
        return '检测到邮箱验证码，请检查邮箱并输入验证码。';
      default:
        return '检测到验证码，请按照页面提示完成验证。';
    }
  }

  private async waitForCaptchaResolution(): Promise<CaptchaResult> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          solved: false,
          error: '验证码处理超时',
        });
      }, 300000); // 5分钟超时

      // 监听验证码完成事件
      const handleCompleted = () => {
        clearTimeout(timeout);
        resolve({
          success: true,
          solved: true,
          token: 'captcha_completed',
        });
      };

      const handleSkipped = () => {
        clearTimeout(timeout);
        resolve({
          success: false,
          solved: false,
          error: '用户跳过验证码',
        });
      };

      // 这里应该通过 IPC 或其他方式监听来自渲染进程的事件
      // 暂时使用简单的超时机制
      setTimeout(() => {
        // 模拟用户完成验证码
        handleCompleted();
      }, 10000); // 10秒后自动完成（用于测试）
      
      // 将处理函数暴露给全局，供 HTML 中的按钮调用
      (global as any).handleCompleted = handleCompleted;
      (global as any).handleSkipped = handleSkipped;
    });
  }

  public async detectCaptcha(): Promise<CaptchaInfo | null> {
    try {
      // 检查当前页面是否包含验证码
      const captchaInfo = await browserManager.executeJavaScript(`
        (function() {
          // 检测图片验证码
          const imageCaptcha = document.querySelector('.captcha img, .verify-code img, [class*="captcha"] img');
          if (imageCaptcha) {
            return {
              type: 'image',
              url: imageCaptcha.src,
              message: '检测到图片验证码',
              timestamp: Date.now()
            };
          }
          
          // 检测滑块验证码
          const sliderCaptcha = document.querySelector('.slider-captcha, .drag-verify, [class*="slider"]');
          if (sliderCaptcha) {
            return {
              type: 'slider',
              message: '检测到滑块验证码',
              timestamp: Date.now()
            };
          }
          
          // 检测短信验证码
          const smsCaptcha = document.querySelector('input[placeholder*="验证码"], input[name*="code"], .sms-code');
          if (smsCaptcha) {
            return {
              type: 'sms',
              message: '检测到短信验证码',
              timestamp: Date.now()
            };
          }
          
          // 检测邮箱验证码
          const emailCaptcha = document.querySelector('input[placeholder*="邮箱"], .email-code');
          if (emailCaptcha) {
            return {
              type: 'email',
              message: '检测到邮箱验证码',
              timestamp: Date.now()
            };
          }
          
          // 检测通用验证码元素
          const captchaElements = document.querySelectorAll('[class*="captcha"], [class*="verify"], [class*="code"]');
          if (captchaElements.length > 0) {
            return {
              type: 'unknown',
              message: '检测到验证码元素',
              timestamp: Date.now()
            };
          }
          
          return null;
        })();
      `);

      if (captchaInfo) {
        logger.info('检测到验证码', captchaInfo);
      }

      return captchaInfo;
    } catch (error) {
      logger.error('检测验证码失败:', error);
      return null;
    }
  }

  public async autoHandleCaptcha(): Promise<CaptchaResult> {
    const captchaInfo = await this.detectCaptcha();
    
    if (!captchaInfo) {
      return { success: true, solved: true }; // 没有验证码
    }

    return await this.handleCaptcha(captchaInfo);
  }

  private closeCaptchaWindow(): void {
    if (this.captchaWindow) {
      this.captchaWindow.close();
      this.captchaWindow = null;
    }
  }

  public isHandlingCaptcha(): boolean {
    return this.isHandling;
  }

  public getCurrentCaptcha(): CaptchaInfo | null {
    return this.currentCaptcha;
  }
}

export const captchaHandler = new CaptchaHandler();
