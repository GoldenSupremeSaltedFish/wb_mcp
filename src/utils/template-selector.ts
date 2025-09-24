import { ConfigTemplateManager, ConfigTemplate } from './config-templates';
import { configManager } from './config';
import { logger } from './logger';

export interface TemplateSelectionResult {
  success: boolean;
  templateId?: string;
  templateName?: string;
  error?: string;
}

export class TemplateSelector {
  public static async selectTemplate(templateId: string): Promise<TemplateSelectionResult> {
    try {
      const template = ConfigTemplateManager.getTemplate(templateId);
      if (!template) {
        return {
          success: false,
          error: `模板 "${templateId}" 不存在`
        };
      }

      // 应用模板配置
      await this.applyTemplateToConfig(template);

      logger.info(`已应用模板: ${template.name} (${templateId})`);
      
      return {
        success: true,
        templateId,
        templateName: template.name
      };
    } catch (error) {
      logger.error('应用模板失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  public static async selectTemplateInteractive(): Promise<TemplateSelectionResult> {
    try {
      const templates = ConfigTemplateManager.getAllTemplates();
      
      // 按分类组织模板
      const categorizedTemplates = this.categorizeTemplates(templates);
      
      // 显示模板选择菜单
      this.displayTemplateMenu(categorizedTemplates);
      
      // 这里可以集成命令行输入或GUI选择
      // 暂时返回默认模板
      return await this.selectTemplate('desktop_normal');
    } catch (error) {
      logger.error('交互式模板选择失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  public static getRecommendedTemplate(userType: 'casual' | 'professional' | 'mobile' | 'enterprise' | 'stealth'): string {
    const recommendations = {
      casual: 'desktop_normal',
      professional: 'desktop_high_res',
      mobile: 'mobile_android',
      enterprise: 'enterprise_user',
      stealth: 'stealth_mode'
    };

    return recommendations[userType] || 'desktop_normal';
  }

  public static async quickSetup(userType: 'casual' | 'professional' | 'mobile' | 'enterprise' | 'stealth'): Promise<TemplateSelectionResult> {
    const templateId = this.getRecommendedTemplate(userType);
    return await this.selectTemplate(templateId);
  }

  private static async applyTemplateToConfig(template: ConfigTemplate): Promise<void> {
    await configManager.updateWeiboConfig({
      userAgent: template.userAgent,
      browserFingerprint: template.browserFingerprint,
      userBehavior: template.userBehavior
    });
  }

  private static categorizeTemplates(templates: ConfigTemplate[]): Map<string, ConfigTemplate[]> {
    const categorized = new Map<string, ConfigTemplate[]>();
    
    templates.forEach(template => {
      if (!categorized.has(template.category)) {
        categorized.set(template.category, []);
      }
      categorized.get(template.category)!.push(template);
    });

    return categorized;
  }

  private static displayTemplateMenu(categorizedTemplates: Map<string, ConfigTemplate[]>): void {
    console.log('\n=== 配置模板选择 ===\n');
    
    const categoryNames = {
      desktop: '桌面用户',
      mobile: '移动端用户',
      enterprise: '企业用户',
      stealth: '隐身模式',
      custom: '自定义'
    };

    categorizedTemplates.forEach((templates, category) => {
      const categoryName = categoryNames[category as keyof typeof categoryNames] || category;
      console.log(`📁 ${categoryName}:`);
      
      templates.forEach(template => {
        const templateId = this.getTemplateIdByName(template.name);
        console.log(`  ${templateId}: ${template.name} - ${template.description}`);
      });
      console.log('');
    });

    console.log('💡 快速选择:');
    console.log('  casual: 普通用户 (desktop_normal)');
    console.log('  professional: 专业用户 (desktop_high_res)');
    console.log('  mobile: 移动端 (mobile_android)');
    console.log('  enterprise: 企业用户 (enterprise_user)');
    console.log('  stealth: 隐身模式 (stealth_mode)');
    console.log('');
  }

  private static getTemplateIdByName(name: string): string {
    const templates = ConfigTemplateManager.getAllTemplates();
    const template = templates.find(t => t.name === name);
    return template ? this.getTemplateId(template) : 'unknown';
  }

  private static getTemplateId(template: ConfigTemplate): string {
    // 这里需要根据模板名称反向查找ID
    // 简化实现，实际应该维护一个反向映射
    const idMap: Record<string, string> = {
      '普通桌面用户': 'desktop_normal',
      '高分辨率桌面用户': 'desktop_high_res',
      'Android移动用户': 'mobile_android',
      'iOS移动用户': 'mobile_ios',
      '企业用户': 'enterprise_user',
      '隐身模式': 'stealth_mode',
      '快速模式': 'fast_mode'
    };
    
    return idMap[template.name] || 'unknown';
  }

  public static async validateCurrentConfig(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      const config = configManager.getWeiboConfig();
      
      // 检查UserAgent是否完整
      if (!config.userAgent.includes('Chrome') || !config.userAgent.includes('Safari')) {
        issues.push('UserAgent可能不够完整');
        recommendations.push('建议使用完整的Chrome UserAgent');
      }
      
      // 检查时区设置
      if (config.browserFingerprint.timezoneOffset !== -480) {
        issues.push('时区设置可能不正确');
        recommendations.push('建议设置为中国时区 (UTC+8)');
      }
      
      // 检查等待时间设置
      if (config.userBehavior.minWaitTime < 1000) {
        issues.push('等待时间过短，可能被检测');
        recommendations.push('建议最小等待时间不少于1秒');
      }
      
      // 检查视口大小
      if (config.browserFingerprint.viewport.width < 800) {
        issues.push('视口宽度过小，可能被识别为移动端');
        recommendations.push('建议使用桌面端视口大小');
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      return {
        isValid: false,
        issues: ['配置验证失败'],
        recommendations: ['请检查配置文件格式']
      };
    }
  }
}
