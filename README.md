# 微博生活助理 MCP 服务

一个基于 Electron 和 MCP (Model Context Protocol) 的**智能生活助理工具**，帮助用户管理微博社交生活，提供评论回复、点赞互动、内容发布等生活助理服务。

## 🚀 功能特性

- **MCP 服务**: 提供标准化的 MCP 接口，支持智能助手调用
- **生活助理功能**: 智能评论回复、自动点赞、内容发布
- **多传输方式**: 支持 STDIO、HTTP 和 SSE 流式传输
- **智能交互**: 模拟真实用户行为，自然流畅的社交互动
- **配置模板**: 多种用户行为模板，一键配置生活助理
- **安全可靠**: 内置反检测机制，保护用户账号安全
- **日志系统**: 完整的操作记录和错误处理
- **请求限流**: 智能限流机制，避免触发平台风控

## 📋 生活助理功能

| 功能名称 | 描述 | 参数 |
|---------|------|------|
| `post_weibo` | 发布微博内容 | content, images, location |
| `reply_comment` | 智能回复评论 | postId, commentId, reply |
| `like_post` | 点赞微博 | postId |
| `like_comment` | 点赞评论 | commentId |
| `follow_user` | 关注用户 | userId |
| `unfollow_user` | 取消关注 | userId |
| `get_mentions` | 获取@我的消息 | limit |
| `get_comments` | 获取我的评论 | limit |
| `get_status` | 获取助理状态 | - |

## 🛠️ 安装和运行

### 环境要求

- Node.js >= 18.0.0
- pnpm (推荐) 或 npm

### 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 配置生活助理

#### 1. 快速配置模板

```bash
# 选择生活助理模式
npm run template:setup casual        # 普通用户模式
npm run template:setup professional  # 专业用户模式
npm run template:setup stealth       # 隐身模式（推荐）
```

#### 2. 配置微博认证

复制环境配置文件：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置微博认证信息：

```env
# 微博认证配置（必需）
WEIBO_ACCESS_TOKEN=your_access_token
WEIBO_COOKIE=your_cookie

# 生活助理配置
MCP_SERVER_PORT=3000
MCP_SERVER_HOST=localhost

# 智能限流配置
REQUEST_RATE_LIMIT=5
REQUEST_INTERVAL_MS=2000
```

### 运行项目

```bash
# 开发模式 (TypeScript 直接运行)
pnpm run start:ts

# 构建并运行
pnpm run build
pnpm run start

# 开发模式 (监听文件变化)
pnpm run dev
```

### 运行测试

```bash
# 运行基础功能测试
npx ts-node tests/basic.test.ts
```

## 📁 项目结构

```
wb_mcp/
├── src/
│   ├── main/           # Electron 主进程
│   ├── renderer/       # 前端界面 (可选)
│   ├── mcpserver/      # MCP 服务实现
│   ├── tools/          # MCP 工具定义
│   ├── api/            # 微博 API 封装
│   ├── auth/           # 认证相关
│   ├── utils/          # 工具函数
│   └── index.ts        # 独立模式入口
├── tests/              # 测试文件
├── config/             # 配置文件目录
├── data/               # 数据存储目录
├── exports/            # 导出文件目录
└── logs/               # 日志文件目录
```

## 🔧 开发指南

### 代码规范

项目遵循以下开发规则：

1. **项目结构**: 所有业务代码必须放在 `src/` 下，按 `auth/api/tools/utils` 分类
2. **配置管理**: 禁止在代码中写死 access_token 或 cookie，必须从 `process.env` 读取
3. **日志记录**: 所有外部请求必须用统一的 logger 记录，禁止 `console.log`
4. **错误处理**: 调用微博 API 必须实现错误重试（指数退避）
5. **Agent 接口**: 每个 task 必须声明 `id`、`inputSchema`、`outputSchema`、`example`
6. **请求限流**: 必须实现请求限流，避免触发微博风控
7. **测试覆盖**: 必须对每个关键任务写单元测试或集成测试

### 添加新工具

1. 在 `src/tools/weibo-tools.ts` 中添加工具定义
2. 实现对应的执行逻辑
3. 在 `src/api/weibo-api.ts` 中添加 API 调用
4. 编写测试用例

### 日志级别

- `DEBUG`: 调试信息
- `INFO`: 一般信息
- `WARN`: 警告信息
- `ERROR`: 错误信息

## 📊 生活助理使用示例

### 智能生活助理功能

#### 发布微博
```bash
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "name": "post_weibo",
    "arguments": {
      "content": "今天天气真好，心情也很棒！",
      "images": ["path/to/image.jpg"],
      "location": "北京市朝阳区"
    }
  }'
```

#### 智能回复评论
```bash
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "name": "reply_comment",
    "arguments": {
      "postId": "1234567890",
      "commentId": "9876543210",
      "reply": "谢谢你的评论，我也这么认为！"
    }
  }'
```

#### 点赞互动
```bash
# 点赞微博
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "name": "like_post",
    "arguments": {
      "postId": "1234567890"
    }
  }'

# 点赞评论
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "name": "like_comment",
    "arguments": {
      "commentId": "9876543210"
    }
  }'
```

#### 获取互动消息
```bash
# 获取@我的消息
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_mentions",
    "arguments": {
      "limit": 10
    }
  }'
```

### 通过 MCP 客户端调用

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "post_weibo",
    "arguments": {
      "content": "今天天气真好，心情也很棒！",
      "images": ["path/to/image.jpg"],
      "location": "北京市朝阳区"
    }
  }
}
```

## 🚨 注意事项

1. **认证配置**: 使用前需要配置有效的微博 access_token 或 cookie
2. **智能限流**: 默认限制为每2秒5次请求，保护账号安全
3. **行为模拟**: 生活助理会模拟真实用户行为，包括随机等待、鼠标移动等
4. **安全保护**: 内置反检测机制，避免被平台识别为机器人
5. **日志记录**: 所有操作都会记录在 `logs/wb_mcp.log` 中

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## ⚖️ License & Usage

本项目遵循 **CC BY-NC 4.0 协议**：
- ✅ 允许个人学习、研究和非商业用途
- ✅ 允许修改和分发（必须保留署名和协议）
- ❌ 严禁任何商业用途（包括但不限于销售、广告、代运营）
- ❌ 严禁用于违反目标平台服务条款的行为

使用本项目所造成的风险和后果，由使用者自行承担。

## 🆘 支持

如果遇到问题，请：

1. 查看日志文件 `logs/wb_mcp.log`
2. 检查配置文件是否正确
3. 确认网络连接和微博认证状态
4. 提交 Issue 描述问题

---

**重要声明**: 本项目是一个**智能生活助理工具**，仅用于个人社交生活管理，帮助用户更好地管理微博互动。严禁用于任何商业用途或违反目标平台服务条款的行为。请遵守微博的使用条款和相关法律法规。