import { BrowserFingerprint, UserBehavior } from './config';

export interface ConfigTemplate {
  name: string;
  description: string;
  category: 'desktop' | 'mobile' | 'enterprise' | 'stealth' | 'custom';
  browserFingerprint: BrowserFingerprint;
  userBehavior: UserBehavior;
  userAgent: string;
}

export class ConfigTemplateManager {
  private static templates: Map<string, ConfigTemplate> = new Map();

  static {
    this.initializeTemplates();
  }

  private static initializeTemplates(): void {
    // 普通桌面用户模板
    this.templates.set('desktop_normal', {
      name: '普通桌面用户',
      description: '模拟普通Windows桌面用户，适合日常使用',
      category: 'desktop',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      browserFingerprint: {
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        timezoneOffset: -480,
        geolocation: {
          latitude: 39.9042,
          longitude: 116.4074,
          accuracy: 100
        },
        viewport: {
          width: 1920,
          height: 1080
        },
        screen: {
          width: 1920,
          height: 1080,
          colorDepth: 24
        },
        platform: 'Win32',
        languages: ['zh-CN', 'zh', 'en-US', 'en']
      },
      userBehavior: {
        minWaitTime: 2000,
        maxWaitTime: 5000,
        simulateMouseMove: true,
        simulateFocus: true,
        simulateScroll: true,
        randomDelay: true
      }
    });

    // 高分辨率桌面用户模板
    this.templates.set('desktop_high_res', {
      name: '高分辨率桌面用户',
      description: '模拟高分辨率显示器用户，适合专业用户',
      category: 'desktop',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      browserFingerprint: {
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        timezoneOffset: -480,
        geolocation: {
          latitude: 39.9042,
          longitude: 116.4074,
          accuracy: 50
        },
        viewport: {
          width: 2560,
          height: 1440
        },
        screen: {
          width: 2560,
          height: 1440,
          colorDepth: 32
        },
        platform: 'Win32',
        languages: ['zh-CN', 'zh', 'en-US', 'en']
      },
      userBehavior: {
        minWaitTime: 1500,
        maxWaitTime: 4000,
        simulateMouseMove: true,
        simulateFocus: true,
        simulateScroll: true,
        randomDelay: true
      }
    });

    // 移动端用户模板
    this.templates.set('mobile_android', {
      name: 'Android移动用户',
      description: '模拟Android手机用户',
      category: 'mobile',
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      browserFingerprint: {
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        timezoneOffset: -480,
        geolocation: {
          latitude: 39.9042,
          longitude: 116.4074,
          accuracy: 20
        },
        viewport: {
          width: 360,
          height: 800
        },
        screen: {
          width: 360,
          height: 800,
          colorDepth: 24
        },
        platform: 'Linux armv8l',
        languages: ['zh-CN', 'zh', 'en-US', 'en']
      },
      userBehavior: {
        minWaitTime: 1000,
        maxWaitTime: 3000,
        simulateMouseMove: false, // 移动端没有鼠标
        simulateFocus: true,
        simulateScroll: true,
        randomDelay: true
      }
    });

    // iOS移动端用户模板
    this.templates.set('mobile_ios', {
      name: 'iOS移动用户',
      description: '模拟iPhone用户',
      category: 'mobile',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      browserFingerprint: {
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        timezoneOffset: -480,
        geolocation: {
          latitude: 39.9042,
          longitude: 116.4074,
          accuracy: 10
        },
        viewport: {
          width: 375,
          height: 812
        },
        screen: {
          width: 375,
          height: 812,
          colorDepth: 24
        },
        platform: 'iPhone',
        languages: ['zh-CN', 'zh', 'en-US', 'en']
      },
      userBehavior: {
        minWaitTime: 800,
        maxWaitTime: 2500,
        simulateMouseMove: false,
        simulateFocus: true,
        simulateScroll: true,
        randomDelay: true
      }
    });

    // 企业用户模板
    this.templates.set('enterprise_user', {
      name: '企业用户',
      description: '模拟企业环境用户，使用较慢的网络和保守的行为',
      category: 'enterprise',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      browserFingerprint: {
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        timezoneOffset: -480,
        geolocation: {
          latitude: 39.9042,
          longitude: 116.4074,
          accuracy: 200
        },
        viewport: {
          width: 1366,
          height: 768
        },
        screen: {
          width: 1366,
          height: 768,
          colorDepth: 24
        },
        platform: 'Win32',
        languages: ['zh-CN', 'zh', 'en-US', 'en']
      },
      userBehavior: {
        minWaitTime: 3000,
        maxWaitTime: 8000,
        simulateMouseMove: true,
        simulateFocus: true,
        simulateScroll: true,
        randomDelay: true
      }
    });

    // 隐身模式模板
    this.templates.set('stealth_mode', {
      name: '隐身模式',
      description: '高度反检测配置，模拟真实用户行为',
      category: 'stealth',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      browserFingerprint: {
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        timezoneOffset: -480,
        geolocation: {
          latitude: 39.9042,
          longitude: 116.4074,
          accuracy: 100
        },
        viewport: {
          width: 1920,
          height: 1080
        },
        screen: {
          width: 1920,
          height: 1080,
          colorDepth: 24
        },
        platform: 'Win32',
        languages: ['zh-CN', 'zh', 'en-US', 'en']
      },
      userBehavior: {
        minWaitTime: 5000,
        maxWaitTime: 12000,
        simulateMouseMove: true,
        simulateFocus: true,
        simulateScroll: true,
        randomDelay: true
      }
    });

    // 快速模式模板
    this.templates.set('fast_mode', {
      name: '快速模式',
      description: '快速执行模式，减少等待时间',
      category: 'custom',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      browserFingerprint: {
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        timezoneOffset: -480,
        geolocation: {
          latitude: 39.9042,
          longitude: 116.4074,
          accuracy: 100
        },
        viewport: {
          width: 1920,
          height: 1080
        },
        screen: {
          width: 1920,
          height: 1080,
          colorDepth: 24
        },
        platform: 'Win32',
        languages: ['zh-CN', 'zh', 'en-US', 'en']
      },
      userBehavior: {
        minWaitTime: 500,
        maxWaitTime: 1500,
        simulateMouseMove: false,
        simulateFocus: false,
        simulateScroll: false,
        randomDelay: false
      }
    });
  }

  public static getTemplate(id: string): ConfigTemplate | undefined {
    return this.templates.get(id);
  }

  public static getAllTemplates(): ConfigTemplate[] {
    return Array.from(this.templates.values());
  }

  public static getTemplatesByCategory(category: string): ConfigTemplate[] {
    return Array.from(this.templates.values()).filter(template => template.category === category);
  }

  public static getTemplateIds(): string[] {
    return Array.from(this.templates.keys());
  }

  public static createCustomTemplate(
    name: string,
    description: string,
    browserFingerprint: BrowserFingerprint,
    userBehavior: UserBehavior,
    userAgent: string
  ): ConfigTemplate {
    return {
      name,
      description,
      category: 'custom',
      browserFingerprint,
      userBehavior,
      userAgent
    };
  }

  public static applyTemplate(templateId: string): Partial<ConfigTemplate> | null {
    const template = this.getTemplate(templateId);
    if (!template) {
      return null;
    }

    return {
      browserFingerprint: template.browserFingerprint,
      userBehavior: template.userBehavior,
      userAgent: template.userAgent
    };
  }
}
