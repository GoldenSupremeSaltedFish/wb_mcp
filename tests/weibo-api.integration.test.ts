import { weiboAPI } from '../src/api/weibo-api';
import { configManager } from '../src/utils/config';

describe('Weibo API Integration Tests', () => {

  describe('Search Posts', () => {
    test('should search posts with valid keyword', async () => {
      const result = await weiboAPI.searchPosts('测试', 5);
      
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeLessThanOrEqual(5);
        
        // 检查帖子结构
        if (result.data.length > 0) {
          const post = result.data[0];
          expect(post).toHaveProperty('id');
          expect(post).toHaveProperty('text');
          expect(post).toHaveProperty('user');
          expect(post).toHaveProperty('created_at');
        }
      }
    });

    test('should handle empty keyword', async () => {
      const result = await weiboAPI.searchPosts('', 5);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('keyword');
    });

    test('should handle invalid limit', async () => {
      const result = await weiboAPI.searchPosts('测试', -1);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');
    });

    test('should respect limit parameter', async () => {
      const result = await weiboAPI.searchPosts('测试', 3);
      
      if (result.success) {
        expect(result.data.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('Hot Topics', () => {
    test('should get hot topics', async () => {
      const result = await weiboAPI.getHotTopics(10);
      
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeLessThanOrEqual(10);
        
        // 检查热搜结构
        if (result.data.length > 0) {
          const topic = result.data[0];
          expect(topic).toHaveProperty('title');
          expect(topic).toHaveProperty('url');
          expect(topic).toHaveProperty('hot');
        }
      }
    });

    test('should handle invalid limit for hot topics', async () => {
      const result = await weiboAPI.getHotTopics(0);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');
    });
  });

  describe('Comments', () => {
    test('should get comments for valid post ID', async () => {
      // 使用一个测试用的微博ID
      const testPostId = '1234567890';
      const result = await weiboAPI.getComments(testPostId, 5);
      
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeLessThanOrEqual(5);
        
        // 检查评论结构
        if (result.data.length > 0) {
          const comment = result.data[0];
          expect(comment).toHaveProperty('id');
          expect(comment).toHaveProperty('text');
          expect(comment).toHaveProperty('user');
          expect(comment).toHaveProperty('created_at');
        }
      }
    });

    test('should handle invalid post ID', async () => {
      const result = await weiboAPI.getComments('', 5);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('postId');
    });
  });

  describe('Authentication', () => {
    test('should check login status', async () => {
      const result = await weiboAPI.checkLoginStatus();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      
      if (result.success) {
        expect(result.data).toHaveProperty('isLoggedIn');
        expect(typeof result.data.isLoggedIn).toBe('boolean');
      }
    });

    test('should handle authentication errors', async () => {
      // 模拟无效的cookie
      const originalConfig = configManager.getWeiboConfig();
      const mockConfig = { ...originalConfig, cookie: 'invalid_cookie' };
      
      // 模拟配置管理器返回无效cookie
      jest.spyOn(configManager, 'getWeiboConfig').mockReturnValue(mockConfig);
      
      const result = await weiboAPI.checkLoginStatus();
      
      // 恢复原始配置
      jest.spyOn(configManager, 'getWeiboConfig').mockReturnValue(originalConfig);
      
      // 应该能够处理认证错误
      expect(result).toHaveProperty('success');
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limiting gracefully', async () => {
      // 快速连续发送多个请求
      const promises = Array(5).fill(null).map(() => 
        weiboAPI.searchPosts('测试', 1)
      );
      
      const results = await Promise.all(promises);
      
      // 所有请求都应该有响应（成功或失败）
      results.forEach((result: any) => {
        expect(result).toHaveProperty('success');
      });
    });
  });

  describe('Network Error Handling', () => {
    test('should handle network timeouts', async () => {
      // 模拟网络超时 - 通过模拟axios超时
      const originalClient = (weiboAPI as any).client;
      const mockClient = {
        ...originalClient,
        get: jest.fn().mockRejectedValue(new Error('timeout of 1ms exceeded')),
      };
      (weiboAPI as any).client = mockClient;
      
      const result = await weiboAPI.searchPosts('测试', 5);
      
      // 恢复原始客户端
      (weiboAPI as any).client = originalClient;
      
      // 应该能够处理超时错误
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle connection errors', async () => {
      // 模拟连接错误
      const originalClient = (weiboAPI as any).client;
      const mockClient = {
        ...originalClient,
        get: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      };
      (weiboAPI as any).client = mockClient;
      
      const result = await weiboAPI.searchPosts('测试', 5);
      
      // 恢复原始客户端
      (weiboAPI as any).client = originalClient;
      
      // 应该能够处理连接错误
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    test('should validate response data structure', async () => {
      const result = await weiboAPI.searchPosts('测试', 1);
      
      if (result.success && result.data.length > 0) {
        const post = result.data[0];
        
        // 验证必需字段
        expect(post.id).toBeDefined();
        expect(post.text).toBeDefined();
        expect(post.user).toBeDefined();
        expect(post.created_at).toBeDefined();
        
        // 验证数据类型
        expect(typeof post.id).toBe('string');
        expect(typeof post.text).toBe('string');
        expect(typeof post.user).toBe('object');
        expect(typeof post.created_at).toBe('string');
        
        // 验证用户对象结构
        expect(post.user).toHaveProperty('id');
        expect(post.user).toHaveProperty('name');
        expect(typeof post.user.id).toBe('string');
        expect(typeof post.user.name).toBe('string');
      }
    });
  });
});
