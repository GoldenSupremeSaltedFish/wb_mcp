import { logger } from './logger';
import { weiboAPI } from '../api/weibo-api';
import { configManager } from './config';
import * as fs from 'fs';
import * as path from 'path';

export interface ScheduledTask {
  id: string;
  name: string;
  interval: number; // 毫秒
  lastRun: number;
  nextRun: number;
  enabled: boolean;
  handler: () => Promise<void>;
  errorCount: number;
  maxErrors: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  timestamp: number;
  data?: any;
  error?: string;
}

class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private results: TaskResult[] = [];
  private maxResults = 1000; // 最多保存 1000 条结果

  constructor() {
    this.initializeDefaultTasks();
  }

  private initializeDefaultTasks(): void {
    // 定时拉取热搜榜
    this.addTask({
      id: 'hot-topics',
      name: '定时拉取热搜榜',
      interval: 30 * 60 * 1000, // 30 分钟
      enabled: true,
      handler: this.fetchHotTopics.bind(this),
      maxErrors: 5,
    });

    // 定时检查认证状态
    this.addTask({
      id: 'auth-check',
      name: '检查认证状态',
      interval: 60 * 60 * 1000, // 1 小时
      enabled: true,
      handler: this.checkAuthentication.bind(this),
      maxErrors: 3,
    });

    // 定时清理日志
    this.addTask({
      id: 'log-cleanup',
      name: '清理旧日志',
      interval: 24 * 60 * 60 * 1000, // 24 小时
      enabled: true,
      handler: this.cleanupLogs.bind(this),
      maxErrors: 3,
    });
  }

  public addTask(task: Omit<ScheduledTask, 'lastRun' | 'nextRun' | 'errorCount'>): void {
    const scheduledTask: ScheduledTask = {
      ...task,
      lastRun: 0,
      nextRun: Date.now() + task.interval,
      errorCount: 0,
    };

    this.tasks.set(task.id, scheduledTask);
    logger.info('添加定时任务', { taskId: task.id, name: task.name, interval: task.interval });
  }

  public removeTask(taskId: string): boolean {
    const removed = this.tasks.delete(taskId);
    if (removed) {
      logger.info('移除定时任务', { taskId });
    }
    return removed;
  }

  public enableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = true;
      task.nextRun = Date.now() + task.interval;
      logger.info('启用定时任务', { taskId });
      return true;
    }
    return false;
  }

  public disableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = false;
      logger.info('禁用定时任务', { taskId });
      return true;
    }
    return false;
  }

  public start(): void {
    if (this.isRunning) {
      logger.warn('任务调度器已在运行');
      return;
    }

    this.isRunning = true;
    this.interval = setInterval(() => {
      this.runScheduledTasks();
    }, 60000); // 每分钟检查一次

    logger.info('任务调度器启动成功', {
      taskCount: this.tasks.size,
      enabledTasks: Array.from(this.tasks.values()).filter(t => t.enabled).length,
    });
  }

  public stop(): void {
    if (!this.isRunning) {
      logger.warn('任务调度器未在运行');
      return;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    logger.info('任务调度器已停止');
  }

  private async runScheduledTasks(): Promise<void> {
    const now = Date.now();
    const tasksToRun = Array.from(this.tasks.values()).filter(
      task => task.enabled && task.nextRun <= now
    );

    for (const task of tasksToRun) {
      try {
        await this.executeTask(task);
      } catch (error) {
        logger.error('执行定时任务失败', { taskId: task.id, error });
      }
    }
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    const startTime = Date.now();
    logger.info('开始执行定时任务', { taskId: task.id, name: task.name });

    try {
      await task.handler();
      
      const duration = Date.now() - startTime;
      task.lastRun = startTime;
      task.nextRun = startTime + task.interval;
      task.errorCount = 0;

      this.addResult({
        taskId: task.id,
        success: true,
        timestamp: startTime,
        data: { duration },
      });

      logger.info('定时任务执行成功', { 
        taskId: task.id, 
        name: task.name, 
        duration: `${duration}ms`,
        nextRun: new Date(task.nextRun).toISOString(),
      });

    } catch (error) {
      task.errorCount++;
      
      this.addResult({
        taskId: task.id,
        success: false,
        timestamp: startTime,
        error: error instanceof Error ? error.message : '未知错误',
      });

      logger.error('定时任务执行失败', { 
        taskId: task.id, 
        name: task.name, 
        error: error instanceof Error ? error.message : '未知错误',
        errorCount: task.errorCount,
        maxErrors: task.maxErrors,
      });

      // 如果错误次数超过限制，禁用任务
      if (task.errorCount >= task.maxErrors) {
        task.enabled = false;
        logger.warn('任务错误次数超限，已禁用', { taskId: task.id, errorCount: task.errorCount });
      } else {
        // 错误后延迟重试
        task.nextRun = startTime + Math.min(task.interval, 5 * 60 * 1000); // 最多延迟 5 分钟
      }
    }
  }

  private async fetchHotTopics(): Promise<void> {
    const topics = await weiboAPI.getHotTopics(50);
    
    // 保存到文件
    const dataDir = configManager.getDataPath();
    const filename = `hot-topics-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(dataDir, filename);
    
    // 读取现有数据
    let existingData: any[] = [];
    if (fs.existsSync(filepath)) {
      try {
        const content = fs.readFileSync(filepath, 'utf8');
        existingData = JSON.parse(content);
      } catch (error) {
        logger.warn('读取现有热搜数据失败', { filepath, error });
      }
    }
    
    // 添加新数据
    const newData = {
      timestamp: new Date().toISOString(),
      topics: topics,
    };
    existingData.push(newData);
    
    // 只保留最近 24 小时的数据
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filteredData = existingData.filter(item => 
      new Date(item.timestamp).getTime() > oneDayAgo
    );
    
    // 保存数据
    fs.writeFileSync(filepath, JSON.stringify(filteredData, null, 2));
    
    logger.info('热搜榜数据已保存', { 
      filepath, 
      topicCount: topics.length,
      totalRecords: filteredData.length,
    });
  }

  private async checkAuthentication(): Promise<void> {
    const isAuthenticated = await weiboAPI.checkAuthentication();
    
    if (!isAuthenticated) {
      logger.warn('微博认证状态异常，可能需要重新登录');
      
      // 尝试刷新 token
      const newToken = await weiboAPI.refreshAccessToken();
      if (newToken) {
        await configManager.updateWeiboConfig({ accessToken: newToken });
        logger.info('微博访问令牌已刷新');
      }
    } else {
      logger.info('微博认证状态正常');
    }
  }

  private async cleanupLogs(): Promise<void> {
    const config = configManager.getConfig();
    const logDir = path.dirname(config.logFile);
    
    if (!fs.existsSync(logDir)) {
      return;
    }
    
    const files = fs.readdirSync(logDir);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    
    for (const file of files) {
      const filepath = path.join(logDir, file);
      const stats = fs.statSync(filepath);
      
      if (stats.mtime.getTime() < oneWeekAgo && file.endsWith('.log')) {
        try {
          fs.unlinkSync(filepath);
          deletedCount++;
        } catch (error) {
          logger.warn('删除旧日志文件失败', { filepath, error });
        }
      }
    }
    
    if (deletedCount > 0) {
      logger.info('清理旧日志文件完成', { deletedCount });
    }
  }

  private addResult(result: TaskResult): void {
    this.results.push(result);
    
    // 保持结果数量在限制内
    if (this.results.length > this.maxResults) {
      this.results = this.results.slice(-this.maxResults);
    }
  }

  public getTaskStatus(): Array<{
    id: string;
    name: string;
    enabled: boolean;
    lastRun: string | null;
    nextRun: string | null;
    errorCount: number;
    maxErrors: number;
  }> {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      name: task.name,
      enabled: task.enabled,
      lastRun: task.lastRun > 0 ? new Date(task.lastRun).toISOString() : null,
      nextRun: task.nextRun > 0 ? new Date(task.nextRun).toISOString() : null,
      errorCount: task.errorCount,
      maxErrors: task.maxErrors,
    }));
  }

  public getRecentResults(limit = 50): TaskResult[] {
    return this.results.slice(-limit);
  }

  public isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}

export const taskScheduler = new TaskScheduler();
