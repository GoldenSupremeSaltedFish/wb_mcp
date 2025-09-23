import request from 'supertest';
import { mcpServer } from '../src/mcpserver/server';
import { weiboTools } from '../src/tools/weibo-tools';
import { taskScheduler } from '../src/utils/scheduler';
import { HttpTransport } from '../src/mcpserver/http-transport';

describe('HTTP API Integration Tests', () => {
  let httpTransport: HttpTransport;
  let app: any;

  beforeAll(async () => {
    // 初始化HTTP传输
    httpTransport = new HttpTransport(mcpServer, { port: 3001 });
    
    // 启动服务
    await mcpServer.start();
    await httpTransport.start();
    
    app = (httpTransport as any).app;
  });

  afterAll(async () => {
    // 清理资源
    await httpTransport.stop();
    await mcpServer.stop();
    taskScheduler.stop();
  });

  describe('Health Check', () => {
    test('GET /health should return server status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Tools API', () => {
    test('GET /tools should return available tools', async () => {
      const response = await request(app)
        .get('/tools')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // 检查工具结构
      response.body.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });

    test('POST /tools/execute should execute tools', async () => {
      const response = await request(app)
        .post('/tools/execute')
        .send({
          tool: 'search_posts',
          arguments: {
            keyword: '测试',
            limit: 5
          }
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    test('POST /tools/execute should handle invalid tool', async () => {
      const response = await request(app)
        .post('/tools/execute')
        .send({
          tool: 'invalid_tool',
          arguments: {}
        })
        .expect(200);
      
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    test('POST /tools/execute should validate required parameters', async () => {
      const response = await request(app)
        .post('/tools/execute')
        .send({
          tool: 'search_posts',
          arguments: {
            // 缺少必需的 keyword 参数
            limit: 5
          }
        })
        .expect(200);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('keyword');
    });
  });

  describe('Server-Sent Events (SSE)', () => {
    test('GET /stream/:toolName should establish SSE connection', (done) => {
      const toolName = 'search_posts';
      
      request(app)
        .get(`/stream/${toolName}`)
        .expect(200)
        .expect('Content-Type', 'text/event-stream')
        .expect('Cache-Control', 'no-cache')
        .expect('Connection', 'keep-alive')
        .end((err, res) => {
          if (err) return done(err);
          
          // 检查SSE响应头
          expect(res.headers['content-type']).toContain('text/event-stream');
          expect(res.headers['cache-control']).toBe('no-cache');
          expect(res.headers['connection']).toBe('keep-alive');
          
          done();
        });
    });

    test('GET /stream/:toolName should handle invalid tool', (done) => {
      const toolName = 'invalid_tool';
      
      request(app)
        .get(`/stream/${toolName}`)
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).toHaveProperty('error');
          expect(res.body.error).toContain('Tool not found');
          
          done();
        });
    });
  });

  describe('Status API', () => {
    test('GET /status should return server status', async () => {
      const response = await request(app)
        .get('/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('server');
      expect(response.body).toHaveProperty('tools');
      expect(response.body).toHaveProperty('transports');
      
      expect(response.body.server).toHaveProperty('name');
      expect(response.body.server).toHaveProperty('version');
      expect(response.body.tools).toHaveProperty('count');
      expect(response.body.transports).toHaveProperty('http');
    });
  });

  describe('CORS and Middleware', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/tools')
        .expect(204);
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should compress responses', async () => {
      const response = await request(app)
        .get('/tools')
        .set('Accept-Encoding', 'gzip')
        .expect(200);
      
      // 检查是否支持压缩
      expect(response.headers['content-encoding'] || response.headers['transfer-encoding']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/tools/execute')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should handle missing Content-Type', async () => {
      const response = await request(app)
        .post('/tools/execute')
        .send('{"tool": "test"}')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });
});
