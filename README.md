# 微博 MCP 工程

一个基于 Electron 和 MCP (Model Context Protocol) 的微博数据采集和服务项目。

## 🚀 功能特性

- **MCP 服务**: 提供标准化的 MCP 接口，支持工具调用
- **多传输方式**: 支持 STDIO、HTTP 和 SSE 流式传输
- **任务调度器**: 定时拉取热搜榜、检查认证状态、清理日志
- **微博数据采集**: 支持搜索微博、获取热搜榜、获取评论等功能
- **数据导出**: 支持 JSON 和 CSV 格式导出
- **配置管理**: 灵活的配置系统，支持环境变量
- **日志系统**: 完整的日志记录和错误处理
- **请求限流**: 内置请求限流机制，避免触发微博风控
- **HTTP API**: RESTful API 接口，支持跨平台调用

## 📋 可用工具

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| `search_posts` | 搜索微博内容 | keyword, limit, sort |
| `get_hot_topics` | 获取微博热搜榜 | limit |
| `get_comments` | 获取微博评论 | postId, limit |
| `post_comment` | 发布微博评论 | postId, text |
| `export_data` | 导出数据 | format, filename, data |
| `get_status` | 获取服务状态 | - |
| `task_scheduler` | 任务调度器管理 | action, taskId, limit |

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

### 配置环境

复制环境配置文件：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置微博相关参数：

```env
# 微博相关配置
WEIBO_ACCESS_TOKEN=your_access_token
WEIBO_COOKIE=your_cookie
WEIBO_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36

# MCP 服务配置
MCP_SERVER_PORT=3000
MCP_SERVER_HOST=localhost

# 请求限流配置
REQUEST_RATE_LIMIT=10
REQUEST_INTERVAL_MS=1000
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

## 📊 使用示例

### HTTP API 调用

#### 健康检查
```bash
curl http://localhost:3000/health
```

#### 获取工具列表
```bash
curl http://localhost:3000/tools
```

#### 执行工具
```bash
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "name": "search_posts",
    "arguments": {
      "keyword": "人工智能",
      "limit": 10,
      "sort": "hot"
    }
  }'
```

#### SSE 流式执行
```bash
curl http://localhost:3000/stream/get_hot_topics?limit=5
```

#### 任务调度器管理
```bash
# 查看任务状态
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"name": "task_scheduler", "arguments": {"action": "status"}}'

# 启用任务
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"name": "task_scheduler", "arguments": {"action": "enable", "taskId": "hot-topics"}}'
```

### 通过 MCP 客户端调用

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_posts",
    "arguments": {
      "keyword": "人工智能",
      "limit": 10,
      "sort": "hot"
    }
  }
}
```

## 🚨 注意事项

1. **认证配置**: 使用前需要配置有效的微博 access_token 或 cookie
2. **请求限流**: 默认限制为每秒 10 次请求，可根据需要调整
3. **数据存储**: 所有数据默认存储在项目目录下的 `data/` 和 `exports/` 文件夹
4. **日志文件**: 日志文件默认存储在 `logs/wb_mcp.log`

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果遇到问题，请：

1. 查看日志文件 `logs/wb_mcp.log`
2. 检查配置文件是否正确
3. 确认网络连接和微博认证状态
4. 提交 Issue 描述问题

---

**注意**: 本项目仅用于学习和研究目的，请遵守微博的使用条款和相关法律法规。