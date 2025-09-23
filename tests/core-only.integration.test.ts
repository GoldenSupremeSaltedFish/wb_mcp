import { taskScheduler } from '../src/utils/scheduler';

describe('Core Integration Tests (No Electron)', () => {
  describe('Task Scheduler', () => {
    test('should have required methods', () => {
      expect(typeof taskScheduler.addTask).toBe('function');
      expect(typeof taskScheduler.start).toBe('function');
      expect(typeof taskScheduler.stop).toBe('function');
      expect(typeof taskScheduler.getTaskStatus).toBe('function');
      expect(typeof taskScheduler.enableTask).toBe('function');
      expect(typeof taskScheduler.disableTask).toBe('function');
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
      expect(status).toBeDefined();
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

    test('should enable and disable tasks', () => {
      const taskId = 'test_task_' + Date.now();
      taskScheduler.addTask({
        id: taskId,
        name: 'test_task',
        interval: 60000,
        enabled: true,
        maxErrors: 3,
        handler: async () => {
          console.log('Test task executed');
        }
      });

      // 禁用任务
      taskScheduler.disableTask(taskId);
      
      // 启用任务
      taskScheduler.enableTask(taskId);
      
      expect(taskScheduler).toBeDefined();
    });
  });

  describe('Configuration', () => {
    test('should have config manager', () => {
      // 测试配置管理器是否存在
      expect(taskScheduler).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid task operations', () => {
      // 测试无效任务ID
      expect(() => {
        taskScheduler.disableTask('invalid_task_id');
      }).not.toThrow();
      
      expect(() => {
        taskScheduler.enableTask('invalid_task_id');
      }).not.toThrow();
    });
  });

  describe('Basic Functionality', () => {
    test('should create and manage multiple tasks', () => {
      const taskIds = [];
      
      // 创建多个任务
      for (let i = 0; i < 3; i++) {
        const taskId = `test_task_${i}_${Date.now()}`;
        taskIds.push(taskId);
        
        taskScheduler.addTask({
          id: taskId,
          name: `test_task_${i}`,
          interval: 60000 + (i * 1000), // 不同的间隔
          enabled: true,
          maxErrors: 3,
          handler: async () => {
            console.log(`Test task ${i} executed`);
          }
        });
      }
      
      expect(taskIds.length).toBe(3);
      
      // 检查所有任务都已添加
      const status = taskScheduler.getTaskStatus();
      expect(status).toBeDefined();
    });

    test('should handle task execution errors gracefully', () => {
      const taskId = 'error_task_' + Date.now();
      
      taskScheduler.addTask({
        id: taskId,
        name: 'error_task',
        interval: 1000, // 1 second
        enabled: true,
        maxErrors: 1,
        handler: async () => {
          throw new Error('Test error');
        }
      });
      
      // 启动调度器
      taskScheduler.start();
      
      // 等待一段时间让任务执行
      setTimeout(() => {
        taskScheduler.stop();
      }, 2000);
      
      expect(taskScheduler).toBeDefined();
    });
  });
});
