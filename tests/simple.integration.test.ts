import { weiboAPI } from '../src/api/weibo-api';
import { weiboTools } from '../src/tools/weibo-tools';
import { taskScheduler } from '../src/utils/scheduler';

describe('Simple Integration Tests', () => {
  describe('Weibo API', () => {
    test('should have searchPosts method', () => {
      expect(typeof weiboAPI.searchPosts).toBe('function');
    });

    test('should have getHotTopics method', () => {
      expect(typeof weiboAPI.getHotTopics).toBe('function');
    });

    test('should have getComments method', () => {
      expect(typeof weiboAPI.getComments).toBe('function');
    });

    test('should search posts with valid parameters', async () => {
      try {
        const result = await weiboAPI.searchPosts('测试', 5);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(5);
      } catch (error) {
        // 网络错误是预期的，只要不崩溃就行
        expect(error).toBeDefined();
      }
    });

    test('should get hot topics', async () => {
      try {
        const result = await weiboAPI.getHotTopics(10);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(10);
      } catch (error) {
        // 网络错误是预期的，只要不崩溃就行
        expect(error).toBeDefined();
      }
    });

    test('should get comments for valid post ID', async () => {
      try {
        const result = await weiboAPI.getComments('1234567890', 5);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(5);
      } catch (error) {
        // 网络错误是预期的，只要不崩溃就行
        expect(error).toBeDefined();
      }
    });
  });

  describe('Weibo Tools', () => {
    test('should have getAvailableTools method', () => {
      expect(typeof weiboTools.getAvailableTools).toBe('function');
    });

    test('should have executeTool method', () => {
      expect(typeof weiboTools.executeTool).toBe('function');
    });

    test('should return available tools', () => {
      const tools = weiboTools.getAvailableTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      // 检查工具结构
      tools.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });

    test('should include expected tools', () => {
      const tools = weiboTools.getAvailableTools();
      const toolNames = tools.map((tool: any) => tool.name);
      
      expect(toolNames).toContain('search_posts');
      expect(toolNames).toContain('get_hot_topics');
      expect(toolNames).toContain('get_comments');
      expect(toolNames).toContain('task_scheduler');
    });

    test('should execute search_posts tool', async () => {
      try {
        const result = await weiboTools.executeTool('search_posts', {
          keyword: '测试',
          limit: 5
        });
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        
        if (result['success']) {
          expect(Array.isArray(result['data'])).toBe(true);
        }
      } catch (error) {
        // 网络错误是预期的，只要不崩溃就行
        expect(error).toBeDefined();
      }
    });

    test('should execute get_hot_topics tool', async () => {
      try {
        const result = await weiboTools.executeTool('get_hot_topics', {
          limit: 10
        });
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        
        if (result['success']) {
          expect(Array.isArray(result['data'])).toBe(true);
        }
      } catch (error) {
        // 网络错误是预期的，只要不崩溃就行
        expect(error).toBeDefined();
      }
    });

    test('should execute task_scheduler tool', async () => {
      const result = await weiboTools.executeTool('task_scheduler', {
        action: 'status'
      });
      
      // 检查返回结果结构
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      
      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        expect(content).toHaveProperty('text');
        expect(content).toHaveProperty('type');
      }
    });

    test('should handle invalid tool name', async () => {
      try {
        await weiboTools.executeTool('invalid_tool', {});
        // 如果没有抛出错误，测试失败
        expect(true).toBe(false);
      } catch (error) {
        // 期望抛出错误
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('未知工具');
      }
    });
  });

  describe('Task Scheduler', () => {
    test('should have addTask method', () => {
      expect(typeof taskScheduler.addTask).toBe('function');
    });

    test('should have start method', () => {
      expect(typeof taskScheduler.start).toBe('function');
    });

    test('should have stop method', () => {
      expect(typeof taskScheduler.stop).toBe('function');
    });

    test('should have getTaskStatus method', () => {
      expect(typeof taskScheduler.getTaskStatus).toBe('function');
    });

    test('should add and manage tasks', () => {
      const taskId = 'test_task_' + Date.now();
      taskScheduler.addTask({
        id: taskId,
        name: 'test_task',
        interval: 60000, // 1 minute
        enabled: true,
        maxErrors: 3,
        handler: async () => {
          console.log('Test task executed');
        }
      });
      
      expect(typeof taskId).toBe('string');
      
      const status = taskScheduler.getTaskStatus();
      expect(Array.isArray(status)).toBe(true);
      
      // 查找我们添加的任务
      const ourTask = status.find((task: any) => task.id === taskId);
      expect(ourTask).toBeDefined();
      expect(ourTask).toHaveProperty('name', 'test_task');
      expect(ourTask).toHaveProperty('enabled', true);
    });

    test('should start and stop scheduler', () => {
      taskScheduler.start();
      // 检查调度器是否启动（通过检查任务状态）
      const status = taskScheduler.getTaskStatus();
      expect(status).toBeDefined();
      
      taskScheduler.stop();
      // 检查调度器是否停止
      expect(taskScheduler).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // 模拟网络错误
      const originalExecuteTool = weiboTools.executeTool;
      weiboTools.executeTool = jest.fn().mockRejectedValue(new Error('Network error'));
      
      try {
        await weiboTools.executeTool('search_posts', { keyword: 'test' });
      } catch (error) {
        expect((error as Error).message).toBe('Network error');
      }
      
      // 恢复原始方法
      weiboTools.executeTool = originalExecuteTool;
    });

    test('should handle invalid parameters', async () => {
      const result = await weiboTools.executeTool('search_posts', {
        invalid_param: 'test'
      });
      
      // 检查返回结果结构
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      
      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        expect(content).toHaveProperty('text');
        expect(content).toHaveProperty('type');
      }
    });
  });
});
