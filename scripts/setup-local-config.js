#!/usr/bin/env node

/**
 * 本地配置设置脚本
 * 用于设置包含敏感信息的本地配置文件
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 设置本地配置...\n');

// 检查是否存在本地配置文件
const configPath = path.join(__dirname, '../config/config.json');
const templatePath = path.join(__dirname, '../config/config.template.json');
const envPath = path.join(__dirname, '../.env');
const envExamplePath = path.join(__dirname, '../env.example');

// 1. 创建本地配置文件
if (!fs.existsSync(configPath)) {
  console.log('📝 创建本地配置文件...');
  
  // 从模板复制
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, configPath);
    console.log('✅ 已创建 config/config.json');
  } else {
    console.log('❌ 模板文件不存在: config/config.template.json');
  }
} else {
  console.log('ℹ️  配置文件已存在: config/config.json');
}

// 2. 创建环境变量文件
if (!fs.existsSync(envPath)) {
  console.log('📝 创建环境变量文件...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ 已创建 .env');
    console.log('⚠️  请编辑 .env 文件，填入真实的微博认证信息');
  } else {
    console.log('❌ 环境变量模板文件不存在: env.example');
  }
} else {
  console.log('ℹ️  环境变量文件已存在: .env');
}

// 3. 检查git状态
console.log('\n🔍 检查Git状态...');
const { execSync } = require('child_process');

try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  const sensitiveFiles = gitStatus.split('\n').filter(line => 
    line.includes('config.json') || 
    line.includes('.env') ||
    line.includes('config.local.json')
  );
  
  if (sensitiveFiles.length > 0) {
    console.log('⚠️  发现敏感文件在Git跟踪中:');
    sensitiveFiles.forEach(file => console.log(`   - ${file.trim()}`));
    console.log('\n建议执行以下命令排除敏感文件:');
    console.log('   git update-index --assume-unchanged config/config.json');
    console.log('   git update-index --assume-unchanged .env');
  } else {
    console.log('✅ 没有敏感文件被Git跟踪');
  }
} catch (error) {
  console.log('ℹ️  不是Git仓库或Git不可用');
}

console.log('\n🎉 本地配置设置完成！');
console.log('\n📋 下一步操作:');
console.log('1. 编辑 config/config.json 文件，填入真实的微博认证信息');
console.log('2. 编辑 .env 文件，设置环境变量');
console.log('3. 运行 pnpm start:ts 启动服务');
console.log('4. 测试真实数据获取功能');
