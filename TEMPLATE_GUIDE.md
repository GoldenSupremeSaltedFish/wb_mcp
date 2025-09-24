# 配置模板使用指南

## 概述

微博MCP项目现在支持配置模板系统，让用户可以通过简单的选择来应用不同的反检测策略，无需手动配置复杂的参数。

## 快速开始

### 1. 使用模板设置工具

```bash
# 运行模板设置向导
npm run template:setup

# 查看所有可用模板
npm run template:list

# 查看当前配置
npm run template:show

# 验证当前配置
npm run template:validate
```

### 2. 快速选择模板

```bash
# 普通用户模式（推荐新手）
npm run template:setup casual

# 专业用户模式（高分辨率）
npm run template:setup professional

# 移动端模式
npm run template:setup mobile

# 企业用户模式（保守设置）
npm run template:setup enterprise

# 隐身模式（高度反检测）
npm run template:setup stealth
```

## 可用模板

### 🖥️ 桌面用户模板

#### 普通桌面用户 (`desktop_normal`)
- **适用场景**: 日常使用，适合大多数用户
- **特点**: 标准1920x1080分辨率，中等等待时间
- **UserAgent**: Chrome 120 Windows 10
- **等待时间**: 2-5秒随机
- **行为模拟**: 完整（鼠标、焦点、滚动）

#### 高分辨率桌面用户 (`desktop_high_res`)
- **适用场景**: 专业用户，高分辨率显示器
- **特点**: 2560x1440分辨率，较快响应
- **UserAgent**: Chrome 120 Windows 10
- **等待时间**: 1.5-4秒随机
- **行为模拟**: 完整

### 📱 移动端用户模板

#### Android移动用户 (`mobile_android`)
- **适用场景**: 模拟Android手机用户
- **特点**: 360x800分辨率，移动端UserAgent
- **UserAgent**: Chrome Mobile Android 13
- **等待时间**: 1-3秒随机
- **行为模拟**: 无鼠标，有焦点和滚动

#### iOS移动用户 (`mobile_ios`)
- **适用场景**: 模拟iPhone用户
- **特点**: 375x812分辨率，iOS UserAgent
- **UserAgent**: Safari Mobile iOS 17
- **等待时间**: 0.8-2.5秒随机
- **行为模拟**: 无鼠标，有焦点和滚动

### 🏢 企业用户模板

#### 企业用户 (`enterprise_user`)
- **适用场景**: 企业环境，网络较慢
- **特点**: 1366x768分辨率，保守设置
- **UserAgent**: Chrome 119 Windows 10
- **等待时间**: 3-8秒随机
- **行为模拟**: 完整，较慢节奏

### 🥷 隐身模式模板

#### 隐身模式 (`stealth_mode`)
- **适用场景**: 需要高度反检测的场景
- **特点**: 标准分辨率，极慢节奏
- **UserAgent**: Chrome 120 Windows 10
- **等待时间**: 5-12秒随机
- **行为模拟**: 完整，最真实

### ⚙️ 自定义模板

#### 快速模式 (`fast_mode`)
- **适用场景**: 测试或快速执行
- **特点**: 最小等待时间，关闭行为模拟
- **UserAgent**: Chrome 120 Windows 10
- **等待时间**: 0.5-1.5秒固定
- **行为模拟**: 全部关闭

## 配置参数说明

### 浏览器指纹 (BrowserFingerprint)

```json
{
  "locale": "zh-CN",           // 语言设置
  "timezone": "Asia/Shanghai", // 时区
  "timezoneOffset": -480,      // 时区偏移（分钟）
  "geolocation": {             // 地理位置
    "latitude": 39.9042,       // 纬度（北京）
    "longitude": 116.4074,     // 经度（北京）
    "accuracy": 100            // 精度（米）
  },
  "viewport": {                // 视口大小
    "width": 1920,
    "height": 1080
  },
  "screen": {                  // 屏幕信息
    "width": 1920,
    "height": 1080,
    "colorDepth": 24           // 颜色深度
  },
  "platform": "Win32",        // 平台信息
  "languages": ["zh-CN", "zh", "en-US", "en"] // 语言列表
}
```

### 用户行为 (UserBehavior)

```json
{
  "minWaitTime": 2000,        // 最小等待时间（毫秒）
  "maxWaitTime": 5000,        // 最大等待时间（毫秒）
  "simulateMouseMove": true,  // 模拟鼠标移动
  "simulateFocus": true,      // 模拟焦点事件
  "simulateScroll": true,     // 模拟滚动行为
  "randomDelay": true         // 随机延迟
}
```

## 使用建议

### 选择模板的建议

1. **新手用户**: 使用 `desktop_normal` 或 `casual`
2. **专业用户**: 使用 `desktop_high_res` 或 `professional`
3. **移动端测试**: 使用 `mobile_android` 或 `mobile_ios`
4. **企业环境**: 使用 `enterprise_user` 或 `enterprise`
5. **高风险场景**: 使用 `stealth_mode` 或 `stealth`
6. **快速测试**: 使用 `fast_mode`

### 配置验证

运行配置验证来检查当前设置：

```bash
npm run template:validate
```

验证会检查：
- UserAgent完整性
- 时区设置正确性
- 等待时间合理性
- 视口大小适当性

### 自定义配置

如果需要自定义配置，可以：

1. 选择一个接近的模板作为基础
2. 手动修改 `config/config.json` 文件
3. 运行验证确保配置正确

## 环境变量支持

所有配置都支持环境变量覆盖：

```bash
# 浏览器设置
export BROWSER_LOCALE=zh-CN
export BROWSER_TIMEZONE=Asia/Shanghai
export BROWSER_VIEWPORT_WIDTH=1920
export BROWSER_VIEWPORT_HEIGHT=1080

# 用户行为设置
export USER_MIN_WAIT_TIME=2000
export USER_MAX_WAIT_TIME=5000
export USER_SIMULATE_MOUSE=true
export USER_SIMULATE_FOCUS=true
export USER_SIMULATE_SCROLL=true
export USER_RANDOM_DELAY=true
```

## 故障排除

### 常见问题

1. **模板应用失败**
   - 检查配置文件权限
   - 确保配置文件格式正确

2. **配置验证失败**
   - 查看具体错误信息
   - 使用推荐模板重新设置

3. **行为模拟不生效**
   - 检查浏览器窗口是否正常创建
   - 查看日志输出确认脚本注入

### 日志查看

```bash
# 查看应用日志
tail -f logs/wb_mcp.log

# 查看特定级别的日志
grep "INFO" logs/wb_mcp.log
grep "ERROR" logs/wb_mcp.log
```

## 高级用法

### 编程方式使用

```typescript
import { TemplateSelector } from './src/utils/template-selector';
import { configManager } from './src/utils/config';

// 应用模板
const result = await TemplateSelector.selectTemplate('desktop_normal');
if (result.success) {
  console.log(`已应用模板: ${result.templateName}`);
}

// 快速设置
await TemplateSelector.quickSetup('professional');

// 验证配置
const validation = await TemplateSelector.validateCurrentConfig();
console.log('配置是否有效:', validation.isValid);
```

### 自定义模板

```typescript
import { ConfigTemplateManager } from './src/utils/config-templates';

const customTemplate = ConfigTemplateManager.createCustomTemplate(
  '我的自定义模板',
  '专门为我的需求定制的模板',
  {
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    timezoneOffset: -480,
    geolocation: {
      latitude: 31.2304,
      longitude: 121.4737,
      accuracy: 100
    },
    viewport: { width: 1920, height: 1080 },
    screen: { width: 1920, height: 1080, colorDepth: 24 },
    platform: 'Win32',
    languages: ['zh-CN', 'zh', 'en-US', 'en']
  },
  {
    minWaitTime: 3000,
    maxWaitTime: 6000,
    simulateMouseMove: true,
    simulateFocus: true,
    simulateScroll: true,
    randomDelay: true
  },
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
);
```

## 更新日志

- **v1.0.0**: 初始版本，支持7种预设模板
- 支持快速选择和交互式设置
- 支持配置验证和自定义模板
- 支持环境变量覆盖
