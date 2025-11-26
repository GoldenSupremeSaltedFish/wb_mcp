# 微博 MCP 项目完整分析

## 📋 项目概览

**项目名称**: `wb_mcp` (微博生活助理 MCP 服务)  
**技术栈**: TypeScript + Node.js + Electron + Playwright  
**协议**: MCP (Model Context Protocol)  
**版本**: 1.0.0  
**许可证**: MIT (CC BY-NC 4.0 非商业使用)

---

## 🏗️ 项目架构

### 核心组件

```
wb_mcp/
├── src/
│   ├── index.ts              # 独立模式入口（MCP Server）
│   ├── main/                 # Electron 主进程
│   │   ├── main.ts           # Electron 应用入口
│   │   └── main-standalone.ts # 独立运行模式
│   ├── mcpserver/            # MCP 服务实现
│   │   ├── server.ts         # MCP Server 核心（STDIO + HTTP）
│   │   └── http-transport.ts # HTTP 传输层（Express）
│   ├── tools/                # MCP 工具定义
│   │   ├── weibo-tools.ts    # 微博工具实现（9个工具）
│   │   └── template-setup.ts # 配置模板工具
│   ├── api/                  # 微博 API 封装
│   │   └── weibo-api.ts      # 微博 API 客户端
│   ├── browser/              # 浏览器自动化
│   │   ├── browser-manager.ts      # Playwright 浏览器管理
│   │   ├── injection-tools.ts      # 页面注入工具
│   │   ├── simple-har-observer.ts  # HAR 观测器
│   │   ├── request-replayer.ts     # 请求重放器
│   │   ├── captcha-handler.ts      # 验证码处理
│   │   └── inject-intercept.js     # 注入拦截脚本
│   ├── utils/                # 工具函数
│   │   ├── config.ts         # 配置管理
│   │   ├── logger.ts         # 日志系统
│   │   ├── scheduler.ts       # 任务调度器
│   │   ├── error-recovery.ts # 错误恢复
│   │   ├── config-templates.ts # 配置模板
│   │   └── template-selector.ts   # 模板选择器
│   └── renderer/             # Electron 渲染进程（可选）
│       └── index.html
├── config/                   # 配置文件
│   ├── config.json           # 主配置
│   ├── config.local.json     # 本地配置（覆盖）
│   └── config.template.json  # 配置模板
├── tests/                    # 测试文件
└── dist/                     # 编译输出
```

---

## 🔧 技术实现细节

### 1. MCP Server 实现

**文件**: `src/mcpserver/server.ts`

- **协议**: 使用 `@modelcontextprotocol/sdk` (v1.18.1)
- **传输方式**: 
  - ✅ **STDIO** (标准输入输出) - 用于 CLI 客户端
  - ✅ **HTTP** (Express) - 用于 HTTP 客户端
- **能力**: `tools` (工具调用)
- **工具注册**: 通过 `weiboTools.getAvailableTools()` 动态获取

**核心代码**:
```typescript
// 初始化 MCP Server
this.server = new Server(
  { name: 'weibo-life-assistant-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 注册工具列表处理器
this.server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: weiboTools.getAvailableTools() };
});

// 注册工具执行处理器
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await weiboTools.executeTool(name, args);
  return result;
});
```

### 2. HTTP 传输层

**文件**: `src/mcpserver/http-transport.ts`

- **框架**: Express 5.1.0
- **端口**: 默认 3000 (可配置)
- **中间件**: CORS, Compression, JSON Parser
- **端点**:
  - `GET /health` - 健康检查
  - `GET /tools` - 获取工具列表
  - `POST /tools/execute` - 执行工具
  - `GET /stream/:toolName` - SSE 流式执行
  - `GET /status` - 服务状态

**示例调用**:
```bash
# 执行工具
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"name": "post_weibo", "arguments": {"content": "测试"}}'
```

### 3. 微博工具定义

**文件**: `src/tools/weibo-tools.ts`

**9个可用工具**:

| 工具名称 | 描述 | 必需参数 |
|---------|------|---------|
| `post_weibo` | 发布微博 | `content` |
| `reply_comment` | 回复评论 | `postId`, `commentId`, `reply` |
| `like_post` | 点赞微博 | `postId` |
| `like_comment` | 点赞评论 | `commentId` |
| `follow_user` | 关注用户 | `userId` |
| `unfollow_user` | 取消关注 | `userId` |
| `get_mentions` | 获取@我的消息 | `limit` (可选) |
| `get_my_comments` | 获取我的评论 | `limit` (可选) |
| `get_status` | 获取服务状态 | 无 |

**工具执行流程**:
```
MCP Client → MCP Server → weiboTools.executeTool() → weiboAPI.*() → 返回结果
```

### 4. 微博 API 封装

**文件**: `src/api/weibo-api.ts`

**实现方式**:
- **HTTP API**: 使用 `axios` 调用微博 REST API
- **浏览器注入**: 使用 Playwright 在页面上下文执行 JavaScript
- **请求拦截**: 通过 HAR 观测和注入脚本捕获真实请求

**关键特性**:
- ✅ 请求拦截器（自动添加认证头）
- ✅ 响应拦截器（指数退避重试）
- ✅ 浏览器指纹模拟
- ✅ 用户行为模拟（随机等待、鼠标移动）

**三步法实现**:
1. **Task A - 快速观测**: 使用 `SimpleHARObserver` 记录 HAR 和请求日志
2. **Task B - 注入拦截**: 注入 `inject-intercept.js` 拦截页面请求
3. **Task C - 页面内复用**: 使用 `RequestReplayer` 重放请求

### 5. 浏览器自动化

**文件**: `src/browser/browser-manager.ts`

- **引擎**: Playwright 1.55.1
- **浏览器**: Chromium (通过 Electron)
- **功能**:
  - 浏览器实例管理
  - 页面上下文注入
  - 请求拦截和重放
  - 验证码处理

**Electron 集成**:
```typescript
// 检查 Electron 环境
if (!injectionTools.isElectronAvailable()) {
  throw new Error('网页版MCP功能需要Electron环境');
}
```

---

## 📦 依赖分析

### 核心依赖

```json
{
  "@modelcontextprotocol/sdk": "^1.18.1",  // MCP 协议 SDK
  "axios": "^1.6.0",                       // HTTP 客户端
  "playwright": "^1.55.1",                 // 浏览器自动化
  "express": "^5.1.0",                     // HTTP 服务器
  "electron": "^38.1.2"                    // Electron 框架
}
```

### 开发依赖

- TypeScript 5.0+
- Jest (测试框架)
- ESLint + Prettier (代码规范)

---

## 🔐 配置管理

**文件**: `config/config.json`

**配置结构**:
```json
{
  "weibo": {
    "accessToken": "",           // 微博访问令牌
    "cookie": "",                // 微博 Cookie
    "userAgent": "...",          // 用户代理
    "rateLimit": 10,             // 请求限流
    "requestInterval": 1000,      // 请求间隔（ms）
    "xsrfToken": "",             // XSRF Token
    "browserFingerprint": {...}, // 浏览器指纹
    "userBehavior": {...}        // 用户行为模拟
  },
  "mcp": {
    "port": 3000,                // HTTP 端口
    "host": "localhost"          // HTTP 主机
  }
}
```

**配置优先级**:
1. `config.local.json` (最高优先级)
2. `config.json`
3. 环境变量 (`.env`)
4. 默认值

---

## 🚀 运行方式

### 1. 独立 MCP Server 模式

```bash
# 开发模式
pnpm run start:ts

# 生产模式
pnpm run build
pnpm run start
```

**特点**:
- 通过 STDIO 与 MCP 客户端通信
- 同时启动 HTTP 服务器 (端口 3000)
- 不需要 Electron

### 2. Electron 应用模式

```bash
# 开发模式
pnpm run dev:electron

# 构建应用
pnpm run build:win    # Windows
pnpm run build:mac    # macOS
pnpm run build:linux  # Linux
```

**特点**:
- 完整的浏览器自动化能力
- 页面注入和请求拦截
- 图形界面（可选）

---

## 📡 MCP 协议实现

### 初始化流程

```
1. Client → initialize
   ↓
2. Server → initialized
   ↓
3. Client → tools/list
   ↓
4. Server → 返回工具列表
```

### 工具调用流程

```
1. Client → tools/call { name, arguments }
   ↓
2. Server → weiboTools.executeTool()
   ↓
3. Server → weiboAPI.*()
   ↓
4. Server → 返回 CallToolResult
```

### 响应格式

```typescript
// 成功响应
{
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        success: true,
        data: {...},
        message: '操作成功'
      })
    }
  ]
}

// 错误响应
{
  content: [{ type: 'text', text: '...' }],
  isError: true
}
```

---

## 🔍 调试方法

### 1. 查看日志

```bash
# 日志文件
tail -f logs/wb_mcp.log

# 日志级别
config.json → logLevel: "debug" | "info" | "warn" | "error"
```

### 2. HTTP 端点测试

```bash
# 健康检查
curl http://localhost:3000/health

# 获取工具列表
curl http://localhost:3000/tools

# 获取服务状态
curl http://localhost:3000/status

# 执行工具
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"name": "get_status", "arguments": {}}'
```

### 3. MCP 客户端连接

**Claude Desktop 配置** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "weibo-mcp": {
      "command": "node",
      "args": ["C:/path/to/wb_mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

---

## ⚠️ 已知限制

1. **Electron 依赖**: 部分功能（如 `post_weibo`, `like_post`）需要 Electron 环境
2. **认证要求**: 需要有效的 `accessToken` 或 `cookie`
3. **请求限流**: 默认每 2 秒 5 次请求，避免触发风控
4. **浏览器指纹**: 需要配置真实的浏览器指纹信息

---

## 🎯 项目特点

### ✅ 优势

1. **双传输模式**: 同时支持 STDIO 和 HTTP
2. **浏览器自动化**: 使用 Playwright 实现真实页面操作
3. **请求拦截**: 三步法捕获和重放真实请求
4. **错误恢复**: 指数退避重试机制
5. **配置模板**: 多种用户行为模板（casual/professional/stealth）

### ⚠️ 注意事项

1. **非商业使用**: 遵循 CC BY-NC 4.0 协议
2. **账号安全**: 内置反检测机制，但需谨慎使用
3. **平台合规**: 需遵守微博服务条款

---

## 📝 下一步建议

1. **完善 API 实现**: 部分 API 方法仍使用模拟数据
2. **增强错误处理**: 添加更多错误恢复策略
3. **扩展工具集**: 添加更多微博功能（如转发、私信等）
4. **性能优化**: 优化请求限流和浏览器资源管理
5. **测试覆盖**: 增加单元测试和集成测试

---

## 🔗 相关文件

- **README.md**: 项目说明文档
- **config/config.template.json**: 配置模板
- **tests/**: 测试用例
- **logs/wb_mcp.log**: 运行日志

---

**最后更新**: 2025-01-XX  
**项目状态**: ✅ 可用（部分功能需 Electron 环境）

