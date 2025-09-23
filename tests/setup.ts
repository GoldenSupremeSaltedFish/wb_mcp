// 测试环境设置

// 设置测试环境变量
process.env['NODE_ENV'] = 'test';
process.env['MCP_SERVER_PORT'] = '3001'; // 使用不同端口避免冲突
process.env['LOG_LEVEL'] = 'error'; // 减少测试日志输出

// 模拟Electron模块
jest.mock('electron', () => ({
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(),
    webContents: {
      executeJavaScript: jest.fn().mockResolvedValue({}),
      setUserAgent: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      send: jest.fn(),
    },
    on: jest.fn(),
    once: jest.fn(),
    close: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    isVisible: jest.fn().mockReturnValue(false),
    isDestroyed: jest.fn().mockReturnValue(false),
  })),
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
    removeAllListeners: jest.fn(),
    removeHandler: jest.fn(),
  },
  app: {
    getPath: jest.fn(() => './test-data'),
    on: jest.fn(),
    whenReady: jest.fn().mockResolvedValue({}),
    isReady: jest.fn().mockReturnValue(true),
    quit: jest.fn(),
  },
}));

// 模拟配置管理器
jest.mock('../src/utils/config', () => ({
  configManager: {
    getConfig: () => ({
      weibo: {
        accessToken: 'test_token',
        cookie: 'test_cookie',
        userAgent: 'test_user_agent',
        rateLimit: 10,
        requestInterval: 1000,
      },
      mcp: {
        port: 3001,
        host: 'localhost',
      },
      logLevel: 'error',
      logFile: 'test.log',
      dataDir: './test-data',
      exportDir: './test-exports',
    }),
    getWeiboConfig: () => ({
      accessToken: 'test_token',
      cookie: 'test_cookie',
      userAgent: 'test_user_agent',
      rateLimit: 10,
      requestInterval: 1000,
    }),
    getMCPConfig: () => ({
      port: 3001,
      host: 'localhost',
    }),
    isWeiboAuthenticated: () => true,
  },
}));

// 全局测试超时
jest.setTimeout(30000);
