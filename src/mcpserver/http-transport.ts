import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { logger } from '../utils/logger';
import { configManager } from '../utils/config';
import { weiboTools } from '../tools/weibo-tools';

export interface HttpTransportOptions {
  port: number;
  host: string;
  enableCORS?: boolean;
  enableCompression?: boolean;
}

export class HttpTransport {
  private app: express.Application;
  private server: any;
  private mcpServer: Server;
  private options: HttpTransportOptions;

  constructor(mcpServer: Server, options: HttpTransportOptions) {
    this.mcpServer = mcpServer;
    this.options = {
      enableCORS: true,
      enableCompression: true,
      ...options,
    };
    
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // 请求解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 压缩
    if (this.options.enableCompression) {
      this.app.use(compression());
    }

    // CORS
    if (this.options.enableCORS) {
      this.app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      }));
    }

    // 请求日志
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`HTTP ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'weibo-mcp-server',
        version: '1.0.0',
      });
    });

    // MCP 工具列表
    this.app.get('/tools', async (req: Request, res: Response) => {
      try {
        const tools = weiboTools.getAvailableTools();
        res.json({
          success: true,
          data: tools,
        });
      } catch (error) {
        logger.error('获取工具列表失败:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    });

    // MCP 工具执行
    this.app.post('/tools/execute', async (req: Request, res: Response) => {
      try {
        const { name, arguments: args } = req.body;
        
        if (!name) {
          return res.status(400).json({
            success: false,
            error: '缺少工具名称',
          });
        }

        logger.logMCPService('HTTP 工具执行', { name, args });
        const result = await weiboTools.executeTool(name, args || {});
        
        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('工具执行失败:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    });

    // SSE 流式响应端点
    this.app.get('/stream/:toolName', async (req: Request, res: Response) => {
      const { toolName } = req.params;
      const args = req.query;

      // 设置 SSE 响应头
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      try {
        logger.logMCPService('SSE 流式执行', { toolName, args });
        
        // 发送初始连接确认
        res.write(`data: ${JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString(),
          tool: toolName,
        })}\n\n`);

        // 执行工具并流式返回结果
        const result = await weiboTools.executeTool(toolName, args);
        
        // 发送结果
        res.write(`data: ${JSON.stringify({
          type: 'result',
          timestamp: new Date().toISOString(),
          data: result,
        })}\n\n`);

        // 发送完成信号
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          timestamp: new Date().toISOString(),
        })}\n\n`);

      } catch (error) {
        logger.error('SSE 流式执行失败:', error);
        
        // 发送错误信息
        res.write(`data: ${JSON.stringify({
          type: 'error',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : '未知错误',
        })}\n\n`);
      }

      // 关闭连接
      res.end();
    });

    // 服务状态
    this.app.get('/status', async (req: Request, res: Response) => {
      try {
        const config = configManager.getConfig();
        res.json({
          success: true,
          data: {
            service: 'weibo-mcp-server',
            version: '1.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            authenticated: configManager.isWeiboAuthenticated(),
            mcpServer: {
              port: config.mcp.port,
              host: config.mcp.host,
            },
            weibo: {
              hasAccessToken: !!config.weibo.accessToken,
              hasCookie: !!config.weibo.cookie,
              rateLimit: config.weibo.rateLimit,
            },
            paths: {
              dataDir: config.dataDir,
              exportDir: config.exportDir,
              logFile: config.logFile,
            },
          },
        });
      } catch (error) {
        logger.error('获取服务状态失败:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    });

    // 错误处理中间件
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('HTTP 请求错误:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    });

    // 404 处理
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: '接口不存在',
        path: req.path,
      });
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.options.port, this.options.host, () => {
          logger.info(`HTTP 传输层启动成功`, {
            host: this.options.host,
            port: this.options.port,
            endpoints: [
              'GET /health - 健康检查',
              'GET /tools - 获取工具列表',
              'POST /tools/execute - 执行工具',
              'GET /stream/:toolName - SSE 流式执行',
              'GET /status - 服务状态',
            ],
          });
          resolve();
        });

        this.server.on('error', (error: Error) => {
          logger.error('HTTP 服务器启动失败:', error);
          reject(error);
        });
      } catch (error) {
        logger.error('启动 HTTP 传输层失败:', error);
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP 传输层已停止');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getServerInfo(): { host: string; port: number; running: boolean } {
    return {
      host: this.options.host,
      port: this.options.port,
      running: !!this.server,
    };
  }
}
