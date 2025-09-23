import { mcpServer } from '../src/mcpserver/server';
import { weiboTools } from '../src/tools/weibo-tools';
import { taskScheduler } from '../src/utils/scheduler';

describe('MCP Server Integration Tests', () => {
  beforeAll(async () => {
    // 启动MCP服务器
    await mcpServer.start();
  });

  afterAll(async () => {
    // 清理资源
    await mcpServer.stop();
    taskScheduler.stop();
  });

  describe('Server Info', () => {
    test('should return server information', () => {
      const info = mcpServer.getServerInfo();
      
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('transports');
      expect(info.transports).toHaveProperty('stdio');
      expect(info.transports).toHaveProperty('http');
    });
  });

  describe('Tools List', () => {
    test('should list all available tools', () => {
      const tools = mcpServer.listTools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      // 检查工具结构
      tools.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });

    test('should include expected Weibo tools', () => {
      const tools = mcpServer.listTools();
      const toolNames = tools.map((tool: any) => tool.name);
      
      expect(toolNames).toContain('search_posts');
      expect(toolNames).toContain('get_hot_topics');
      expect(toolNames).toContain('get_comments');
      expect(toolNames).toContain('task_scheduler');
    });
  });

  describe('Tool Execution', () => {
    test('should execute search_posts tool', async () => {
      const result = await mcpServer.executeTool('search_posts', {
        keyword: '测试',
        limit: 5
      });
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    test('should execute get_hot_topics tool', async () => {
      const result = await mcpServer.executeTool('get_hot_topics', {
        limit: 10
      });
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    test('should execute task_scheduler tool', async () => {
      const result = await mcpServer.executeTool('task_scheduler', {
        action: 'status'
      });
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      
      if (result.success) {
        expect(result.data).toHaveProperty('tasks');
        expect(Array.isArray(result.data.tasks)).toBe(true);
      }
    });

    test('should handle invalid tool name', async () => {
      const result = await mcpServer.executeTool('invalid_tool', {});
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });

    test('should handle invalid parameters', async () => {
      const result = await mcpServer.executeTool('search_posts', {
        invalid_param: 'test'
      });
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // 模拟网络错误
      const originalExecuteTool = weiboTools.executeTool;
      weiboTools.executeTool = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await mcpServer.executeTool('search_posts', {
        keyword: 'test'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      
      // 恢复原始方法
      weiboTools.executeTool = originalExecuteTool;
    });
  });
});
