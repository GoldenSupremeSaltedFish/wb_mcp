import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { configManager } from '../utils/config';

export interface WeiboPost {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  createdAt: string;
  repostsCount: number;
  commentsCount: number;
  attitudesCount: number;
  images?: string[];
}

export interface HotTopic {
  id: string;
  title: string;
  hot: number;
  url: string;
  rank: number;
}

export interface WeiboComment {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  createdAt: string;
  likeCount: number;
  replyCount: number;
}

class WeiboAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': configManager.getWeiboConfig().userAgent,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        const weiboConfig = configManager.getWeiboConfig();
        
        // 添加认证信息
        if (weiboConfig.accessToken) {
          config.headers.Authorization = `Bearer ${weiboConfig.accessToken}`;
        }
        
        if (weiboConfig.cookie) {
          config.headers['Cookie'] = weiboConfig.cookie;
        }

        logger.logApiRequest(config.method?.toUpperCase() || 'GET', config.url || '');
        return config;
      },
      (error) => {
        logger.error('请求拦截器错误:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        logger.logApiRequest(
          response.config.method?.toUpperCase() || 'GET',
          response.config.url || '',
          response.status
        );
        return response;
      },
      async (error) => {
        const config = error.config;
        
        if (config && !config._retry) {
          config._retry = true;
          
          // 指数退避重试
          const delay = Math.pow(2, config._retryCount || 0) * 1000;
          config._retryCount = (config._retryCount || 0) + 1;
          
          if (config._retryCount <= 3) {
            logger.logRetry('API 请求', config._retryCount, 3, error.message);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.client(config);
          }
        }
        
        logger.error('API 请求失败:', error);
        return Promise.reject(error);
      }
    );
  }


  public async searchPosts(keyword: string, limit = 20, sort: 'time' | 'hot' = 'time'): Promise<WeiboPost[]> {
    try {
      logger.logWeiboOperation('搜索微博', { keyword, limit, sort });
      
      // 这里应该调用实际的微博搜索 API
      // 由于微博 API 需要复杂的认证，这里返回模拟数据
      const mockPosts: WeiboPost[] = [
        {
          id: '1',
          text: `关于 "${keyword}" 的微博内容`,
          user: {
            id: 'user1',
            name: '示例用户',
            avatar: 'https://example.com/avatar.jpg',
          },
          createdAt: new Date().toISOString(),
          repostsCount: 10,
          commentsCount: 5,
          attitudesCount: 20,
        },
      ];
      
      return mockPosts.slice(0, limit);
    } catch (error) {
      logger.error('搜索微博失败:', error);
      throw error;
    }
  }

  public async getHotTopics(limit = 50): Promise<HotTopic[]> {
    try {
      logger.logWeiboOperation('获取热搜榜', { limit });
      
      // 这里应该调用实际的微博热搜 API
      // 返回模拟数据
      const mockTopics: HotTopic[] = [
        {
          id: '1',
          title: '示例热搜话题',
          hot: 1000000,
          url: 'https://weibo.com/hot/topic/1',
          rank: 1,
        },
      ];
      
      return mockTopics.slice(0, limit);
    } catch (error) {
      logger.error('获取热搜榜失败:', error);
      throw error;
    }
  }

  public async getComments(postId: string, limit = 20): Promise<WeiboComment[]> {
    try {
      logger.logWeiboOperation('获取评论', { postId, limit });
      
      // 这里应该调用实际的微博评论 API
      // 返回模拟数据
      const mockComments: WeiboComment[] = [
        {
          id: '1',
          text: '示例评论内容',
          user: {
            id: 'user1',
            name: '评论用户',
            avatar: 'https://example.com/avatar.jpg',
          },
          createdAt: new Date().toISOString(),
          likeCount: 5,
          replyCount: 2,
        },
      ];
      
      return mockComments.slice(0, limit);
    } catch (error) {
      logger.error('获取评论失败:', error);
      throw error;
    }
  }

  public async postComment(postId: string, text: string, requireConfirmation = true): Promise<any> {
    try {
      logger.logWeiboOperation('发布评论', { postId, text, requireConfirmation });
      
      if (requireConfirmation) {
        // 这里应该显示确认对话框
        logger.warn('评论发布需要用户确认:', { postId, text });
        return {
          success: true,
          message: '评论已提交，等待用户确认',
          postId,
          text,
        };
      }
      
      // 这里应该调用实际的微博评论发布 API
      return {
        success: true,
        message: '评论发布成功',
        postId,
        text,
      };
    } catch (error) {
      logger.error('发布评论失败:', error);
      throw error;
    }
  }

  public async checkAuthentication(): Promise<boolean> {
    try {
      const config = configManager.getWeiboConfig();
      
      if (!config.accessToken && !config.cookie) {
        return false;
      }
      
      // 这里应该调用实际的认证检查 API
      // 暂时返回 true
      return true;
    } catch (error) {
      logger.error('检查认证状态失败:', error);
      return false;
    }
  }

  public async refreshAccessToken(): Promise<string | null> {
    try {
      logger.logWeiboOperation('刷新访问令牌');
      
      // 这里应该调用实际的令牌刷新 API
      // 暂时返回 null
      return null;
    } catch (error) {
      logger.error('刷新访问令牌失败:', error);
      return null;
    }
  }
}

export const weiboAPI = new WeiboAPI();
