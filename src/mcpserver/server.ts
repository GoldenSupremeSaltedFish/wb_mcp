import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger';
import { configManager } from '../utils/config';
import { weiboTools } from '../tools/weibo-tools';
import { HttpTransport } from './http-transport';

class MCPServer {
  private server: Server;
  private stdioTransport: StdioServerTransport;
  private httpTransport: HttpTransport | null = null;
  private isRunning = false;

  constructor() {
    this.server = new Server(
      {
        name: 'weibo-life-assistant-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.stdioTransport = new StdioServerTransport();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.logMCPService('列出生活助理功能');
      return {
        tools: weiboTools.getAvailableTools(),
      };
    });

    // 执行工具
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.logMCPService('执行生活助理功能', { name, args });

      try {
        const result = await weiboTools.executeTool(name, args);
        logger.logMCPService('生活助理功能执行成功', { name, result });
        return result;
      } catch (error) {
        logger.error('生活助理功能执行失败', { name, error });
        throw error;
      }
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('MCP 服务器已在运行');
      return;
    }

    try {
      // 启动 STDIO 传输
      await this.server.connect(this.stdioTransport);
      
      // 启动 HTTP 传输
      const config = configManager.getMCPConfig();
      this.httpTransport = new HttpTransport(this.server, {
        host: config.host,
        port: config.port,
      });
      await this.httpTransport.start();
      
      this.isRunning = true;
      logger.info('MCP 服务器启动成功', {
        stdio: 'enabled',
        http: this.httpTransport.getServerInfo(),
      });
    } catch (error) {
      logger.error('MCP 服务器启动失败:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('MCP 服务器未在运行');
      return;
    }

    try {
      // 停止 HTTP 传输
      if (this.httpTransport) {
        await this.httpTransport.stop();
        this.httpTransport = null;
      }
      
      // 停止 STDIO 传输
      await this.server.close();
      this.isRunning = false;
      logger.info('MCP 服务器已停止');
    } catch (error) {
      logger.error('停止 MCP 服务器失败:', error);
      throw error;
    }
  }

  public isServerRunning(): boolean {
    return this.isRunning;
  }

  public getServerInfo(): { 
    name: string; 
    version: string; 
    running: boolean;
    transports: {
      stdio: boolean;
      http?: { host: string; port: number; running: boolean };
    };
  } {
    return {
      name: 'weibo-mcp-server',
      version: '1.0.0',
      running: this.isRunning,
      transports: {
        stdio: this.isRunning,
        ...(this.httpTransport && { http: this.httpTransport.getServerInfo() }),
      },
    };
  }
}

export const mcpServer = new MCPServer();
