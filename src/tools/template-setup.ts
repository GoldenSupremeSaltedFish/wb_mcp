#!/usr/bin/env node

import { TemplateSelector } from '../utils/template-selector';
import { configManager } from '../utils/config';
// import { logger } from '../utils/logger';

class TemplateSetupTool {
  public static async run(): Promise<void> {
    console.log('🚀 微博MCP配置模板设置工具\n');
    
    try {
      // 检查当前配置
      const validation = await TemplateSelector.validateCurrentConfig();
      if (!validation.isValid) {
        console.log('⚠️  当前配置存在问题:');
        validation.issues.forEach(issue => console.log(`   - ${issue}`));
        console.log('\n💡 建议:');
        validation.recommendations.forEach(rec => console.log(`   - ${rec}`));
        console.log('');
      }

      // 显示可用模板
      this.displayAvailableTemplates();
      
      // 获取用户选择
      const userType = await this.getUserType();
      
      if (userType) {
        const result = await TemplateSelector.quickSetup(userType);
        if (result.success) {
          console.log(`✅ 已成功应用模板: ${result.templateName}`);
          console.log('🎉 配置完成！现在可以启动应用了。');
        } else {
          console.log(`❌ 应用模板失败: ${result.error}`);
        }
      }
      
    } catch (error) {
      console.error('❌ 设置失败:', error);
      process.exit(1);
    }
  }

  private static displayAvailableTemplates(): void {
    const templates = configManager.getAvailableTemplates();
    const categories = new Map<string, typeof templates>();
    
    // 按分类组织
    templates.forEach(template => {
      if (!categories.has(template.category)) {
        categories.set(template.category, []);
      }
      categories.get(template.category)!.push(template);
    });

    console.log('📋 可用配置模板:\n');
    
    categories.forEach((templates, category) => {
      const categoryNames: Record<string, string> = {
        desktop: '🖥️  桌面用户',
        mobile: '📱 移动端用户',
        enterprise: '🏢 企业用户',
        stealth: '🥷 隐身模式',
        custom: '⚙️  自定义'
      };
      
      console.log(`${categoryNames[category] || category}:`);
      templates.forEach(template => {
        console.log(`   ${template.id}: ${template.name}`);
        console.log(`      ${template.description}`);
      });
      console.log('');
    });
  }

  private static async getUserType(): Promise<'casual' | 'professional' | 'mobile' | 'enterprise' | 'stealth' | null> {
    console.log('🎯 快速选择 (推荐):');
    console.log('   1. casual - 普通用户 (日常使用)');
    console.log('   2. professional - 专业用户 (高分辨率)');
    console.log('   3. mobile - 移动端用户');
    console.log('   4. enterprise - 企业用户 (保守设置)');
    console.log('   5. stealth - 隐身模式 (高度反检测)');
    console.log('   0. 退出\n');

    // 这里可以集成readline或其他输入库
    // 暂时返回默认值
    console.log('💡 使用默认配置: 普通用户模式');
    return 'casual';
  }

  public static async listTemplates(): Promise<void> {
    console.log('📋 所有可用模板:\n');
    
    const templates = configManager.getAvailableTemplates();
    templates.forEach(template => {
      console.log(`🔹 ${template.name} (${template.id})`);
      console.log(`   分类: ${template.category}`);
      console.log(`   描述: ${template.description}`);
      console.log('');
    });
  }

  public static async showCurrentConfig(): Promise<void> {
    console.log('📊 当前配置信息:\n');
    
    try {
      const config = configManager.getWeiboConfig();
      const currentTemplate = configManager.getCurrentTemplateId();
      
      console.log(`当前模板: ${currentTemplate || '自定义配置'}`);
      console.log(`UserAgent: ${config.userAgent}`);
      console.log(`语言: ${config.browserFingerprint.locale}`);
      console.log(`时区: ${config.browserFingerprint.timezone}`);
      console.log(`视口: ${config.browserFingerprint.viewport.width}x${config.browserFingerprint.viewport.height}`);
      console.log(`等待时间: ${config.userBehavior.minWaitTime}-${config.userBehavior.maxWaitTime}ms`);
      console.log(`鼠标模拟: ${config.userBehavior.simulateMouseMove ? '开启' : '关闭'}`);
      console.log(`焦点模拟: ${config.userBehavior.simulateFocus ? '开启' : '关闭'}`);
      console.log(`滚动模拟: ${config.userBehavior.simulateScroll ? '开启' : '关闭'}`);
      console.log(`随机延迟: ${config.userBehavior.randomDelay ? '开启' : '关闭'}`);
      
    } catch (error) {
      console.error('❌ 获取配置失败:', error);
    }
  }

  public static async validateConfig(): Promise<void> {
    console.log('🔍 配置验证:\n');
    
    const validation = await TemplateSelector.validateCurrentConfig();
    
    if (validation.isValid) {
      console.log('✅ 配置验证通过！');
    } else {
      console.log('❌ 配置存在问题:');
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    if (validation.recommendations.length > 0) {
      console.log('\n💡 建议:');
      validation.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'list':
    TemplateSetupTool.listTemplates();
    break;
  case 'show':
    TemplateSetupTool.showCurrentConfig();
    break;
  case 'validate':
    TemplateSetupTool.validateConfig();
    break;
  case 'setup':
  default:
    TemplateSetupTool.run();
    break;
}

export { TemplateSetupTool };
