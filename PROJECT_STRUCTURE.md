# 项目结构树

```
wb_mcp/
├── assets/                    # 资源文件目录
├── config/                    # 配置文件目录
│   ├── config.json
│   ├── config.local.json
│   └── config.template.json
├── data/                      # 数据文件目录
│   └── hot-topics-2025-09-29.json
├── exports/                   # 导出文件目录
├── logs/                      # 日志文件目录
│   └── wb_mcp.log
├── scripts/                   # 脚本文件目录
│   ├── deploy.bat
│   ├── deploy.sh
│   ├── proxy-manager.bat
│   ├── setup-local-config.js
│   ├── test.bat
│   └── test.sh
├── src/                       # 源代码目录
│   ├── api/                   # API 相关
│   │   └── weibo-api.ts
│   ├── auth/                  # 认证相关
│   ├── browser/               # 浏览器相关
│   │   ├── browser-manager.ts
│   │   ├── captcha-handler.ts
│   │   ├── inject-intercept.js
│   │   ├── injection-tools.ts
│   │   ├── request-replayer.ts
│   │   └── simple-har-observer.ts
│   ├── main/                  # 主程序入口
│   │   ├── main-standalone.ts
│   │   └── main.ts
│   ├── mcpserver/             # MCP 服务器
│   │   ├── http-transport.ts
│   │   └── server.ts
│   ├── renderer/              # 渲染器相关
│   │   └── index.html
│   ├── tools/                 # 工具函数
│   │   ├── template-setup.ts
│   │   └── weibo-tools.ts
│   ├── utils/                 # 工具类
│   │   ├── config-templates.ts
│   │   ├── config.ts
│   │   ├── error-recovery.ts
│   │   ├── logger.ts
│   │   ├── scheduler.ts
│   │   └── template-selector.ts
│   └── index.ts               # 入口文件
├── tests/                     # 测试文件目录
│   ├── advanced.test.ts
│   ├── basic.test.ts
│   ├── core-only.integration.test.ts
│   ├── electron.integration.test.ts
│   ├── http-api.integration.test.ts
│   ├── mcp-only.test.ts
│   ├── mcp-server.integration.test.ts
│   ├── README.md
│   ├── setup.ts
│   ├── simple.integration.test.ts
│   ├── standalone.test.ts
│   └── weibo-api.integration.test.ts
├── demo-three-step.js         # 演示文件
├── ELECTRON_STATUS.md         # Electron 状态文档
├── env.example                # 环境变量示例
├── FINAL_STATUS.md            # 最终状态文档
├── jest.config.js             # Jest 配置
├── package.json               # 项目配置
├── package-lock.json          # 依赖锁定文件
├── pnpm-lock.yaml             # pnpm 锁定文件
├── pnpm-workspace.yaml        # pnpm 工作区配置
├── PROJECT_ANALYSIS.md        # 项目分析文档
├── PROJECT_COMPLETION.md      # 项目完成文档
├── README.md                  # 项目说明
├── REAL_DATA_STATUS.md        # 真实数据状态文档
├── rules.md                   # 规则文档
├── start.bat                  # 启动脚本
├── TEMPLATE_GUIDE.md          # 模板指南
├── TEST_RESULTS.md            # 测试结果
├── test-electron-app.js       # Electron 测试
├── test-electron-context.js   # Electron 上下文测试
├── test-mcp-only.js           # MCP 测试
├── test-real-data.js          # 真实数据测试
├── test-simple-api.js         # 简单 API 测试
├── test-standalone.js         # 独立测试
└── tsconfig.json              # TypeScript 配置
```

## 目录说明

- **assets/**: 存放静态资源文件
- **config/**: 存放配置文件，包括模板和本地配置
- **data/**: 存放数据文件，如热点话题数据
- **src/**: 主要源代码目录
  - **api/**: 微博 API 相关代码
  - **auth/**: 认证相关代码
  - **browser/**: 浏览器自动化相关代码
  - **main/**: 主程序入口文件
  - **mcpserver/**: MCP 服务器实现
  - **renderer/**: 渲染器相关文件
  - **tools/**: 工具函数
  - **utils/**: 工具类，包括配置、日志、调度器等
- **tests/**: 测试文件目录
- **scripts/**: 构建和部署脚本
- **logs/**: 日志文件目录
- **exports/**: 导出文件目录

