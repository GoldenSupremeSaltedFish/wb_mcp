# 微博 MCP 集成测试

## 测试概述

本测试套件提供了完整的集成测试，验证微博 MCP 服务的各个组件功能。

## 测试结构

```
tests/
├── setup.ts                          # 测试环境设置
├── mcp-server.integration.test.ts     # MCP 服务集成测试
├── http-api.integration.test.ts       # HTTP API 集成测试
├── weibo-api.integration.test.ts      # 微博 API 集成测试
└── README.md                          # 本文档
```

## 测试类型

### 1. MCP 服务集成测试 (`mcp-server.integration.test.ts`)

测试 MCP 服务的核心功能：
- 服务器信息获取
- 工具列表功能
- 工具执行功能
- 错误处理机制

### 2. HTTP API 集成测试 (`http-api.integration.test.ts`)

测试 HTTP 传输层的功能：
- 健康检查端点
- 工具 API 端点
- 服务器发送事件 (SSE)
- 状态 API
- CORS 和中间件
- 错误处理

### 3. 微博 API 集成测试 (`weibo-api.integration.test.ts`)

测试微博 API 的功能：
- 搜索帖子
- 获取热搜
- 获取评论
- 认证状态检查
- 速率限制处理
- 网络错误处理
- 数据验证

## 运行测试

### 运行所有测试
```bash
pnpm test
```

### 运行集成测试
```bash
pnpm test:integration
```

### 运行单元测试
```bash
pnpm test:unit
```

### 运行测试并生成覆盖率报告
```bash
pnpm test:coverage
```

### 监视模式运行测试
```bash
pnpm test:watch
```

### 使用脚本运行测试

#### Windows
```bash
scripts\test.bat
```

#### Linux/macOS
```bash
chmod +x scripts/test.sh
./scripts/test.sh
```

## 测试配置

### Jest 配置 (`jest.config.js`)

- **预设**: `ts-jest` - TypeScript 支持
- **测试环境**: `node` - Node.js 环境
- **测试匹配**: `**/*.test.ts` - 匹配所有测试文件
- **覆盖率收集**: 从 `src/**/*.ts` 收集，排除主进程和渲染进程
- **超时时间**: 30 秒
- **详细输出**: 启用

### 测试设置 (`tests/setup.ts`)

- 设置测试环境变量
- 模拟配置模块
- 设置全局测试超时

## 测试报告

### 覆盖率报告
- **HTML 报告**: `coverage/lcov-report/index.html`
- **LCOV 报告**: `coverage/lcov.info`
- **文本报告**: 控制台输出

### JUnit 报告
- **XML 报告**: `test-results/junit.xml`
- 适用于 CI/CD 集成

## 测试数据

### 模拟数据
测试使用模拟的微博数据，避免依赖真实的微博 API：
- 搜索关键词: "测试"
- 帖子 ID: "1234567890"
- 限制数量: 1-10

### 环境隔离
- 使用独立的测试端口 (3001)
- 设置测试专用的日志级别
- 模拟网络错误和超时情况

## 故障排除

### 常见问题

1. **端口冲突**
   - 确保测试端口 3001 未被占用
   - 检查是否有其他服务在运行

2. **依赖问题**
   - 运行 `pnpm install` 确保所有依赖已安装
   - 检查 Node.js 版本 (需要 >= 18.0.0)

3. **网络问题**
   - 测试会模拟网络错误，这是正常的
   - 如果所有测试都失败，检查网络连接

4. **超时问题**
   - 测试超时设置为 30 秒
   - 如果经常超时，可以增加 `jest.setTimeout()` 的值

### 调试技巧

1. **运行单个测试文件**
   ```bash
   pnpm test tests/mcp-server.integration.test.ts
   ```

2. **运行特定测试**
   ```bash
   pnpm test -- --testNamePattern="should search posts"
   ```

3. **详细输出**
   ```bash
   pnpm test -- --verbose
   ```

4. **调试模式**
   ```bash
   pnpm test -- --detectOpenHandles --forceExit
   ```

## 持续集成

### GitHub Actions 示例
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v1
```

## 贡献指南

### 添加新测试

1. 在相应的测试文件中添加测试用例
2. 遵循现有的命名约定
3. 添加适当的错误处理测试
4. 更新本文档

### 测试最佳实践

1. **独立性**: 每个测试应该独立运行
2. **可重复性**: 测试结果应该一致
3. **快速执行**: 避免长时间运行的测试
4. **清晰命名**: 测试名称应该描述测试内容
5. **适当断言**: 使用有意义的断言

### 代码覆盖率目标

- **语句覆盖率**: > 80%
- **分支覆盖率**: > 70%
- **函数覆盖率**: > 80%
- **行覆盖率**: > 80%
