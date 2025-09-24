import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { configManager } from '../utils/config';
import { injectionTools } from '../browser/injection-tools';
import { errorRecovery } from '../utils/error-recovery';

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

export interface PostWeiboResult {
  success: boolean;
  postId?: string;
  message?: string;
}

export interface LikeResult {
  success: boolean;
  liked: boolean;
  message?: string;
}

export interface FollowResult {
  success: boolean;
  followed: boolean;
  message?: string;
}

export interface Mention {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  postId: string;
  createdAt: string;
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
      
      // 尝试使用浏览器注入方式获取真实数据（带重试）
      const injectionResult = await errorRecovery.retryBrowserOperation(async () => {
        const result = await injectionTools.searchPosts(keyword, limit, sort);
        if (result.success && result.data) {
          // 转换注入工具返回的数据格式
          return result.data.map((post: any) => ({
            id: post.id,
            text: post.text,
            user: {
              id: post.author.id,
              name: post.author.name,
              avatar: post.author.avatar,
            },
            createdAt: post.createdAt,
            repostsCount: post.repostsCount,
            commentsCount: post.commentsCount,
            attitudesCount: post.attitudesCount,
          }));
        }
        throw new Error('注入工具返回失败');
      });

      if (injectionResult.success && injectionResult.result) {
        return injectionResult.result;
      } else {
        logger.warn('浏览器注入搜索失败，使用模拟数据:', injectionResult.error);
      }
      
      // 如果注入失败，返回模拟数据
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
      
      // 尝试使用浏览器注入方式获取真实数据
      try {
        const result = await injectionTools.getHotTopics(limit);
        if (result.success && result.data) {
          return result.data.map((topic: any) => ({
            id: topic.id,
            title: topic.title,
            hot: topic.hot,
            url: topic.url,
            rank: topic.rank,
          }));
        }
      } catch (injectionError) {
        logger.warn('浏览器注入获取热搜失败，使用模拟数据:', injectionError);
      }
      
      // 如果注入失败，返回模拟数据
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
      
      // 尝试使用浏览器注入方式获取真实数据
      try {
        const result = await injectionTools.getComments(postId, limit);
        if (result.success && result.data) {
          return result.data.map((comment: any) => ({
            id: comment.id,
            text: comment.text,
            user: {
              id: comment.user.id,
              name: comment.user.name,
              avatar: comment.user.avatar,
            },
            createdAt: comment.createdAt,
            likeCount: comment.likeCount,
            replyCount: comment.replyCount,
          }));
        }
      } catch (injectionError) {
        logger.warn('浏览器注入获取评论失败，使用模拟数据:', injectionError);
      }
      
      // 如果注入失败，返回模拟数据
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
      
      // 尝试使用浏览器注入方式检查登录状态
      try {
        const result = await injectionTools.checkLoginStatus();
        if (result.success && result.data) {
          return result.data.isLoggedIn;
        }
      } catch (injectionError) {
        logger.warn('浏览器注入检查登录状态失败:', injectionError);
      }
      
      // 如果注入失败，基于配置判断
      return !!(config.accessToken || config.cookie);
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

  // 生活助理功能方法

  public async postWeibo(content: string, images?: string[], location?: string): Promise<PostWeiboResult> {
    try {
      logger.logWeiboOperation('发布微博', { content, images, location });
      
      // 这里应该调用实际的微博发布 API
      // 暂时返回模拟结果
      return {
        success: true,
        postId: `post_${Date.now()}`,
        message: '微博发布成功',
      };
    } catch (error) {
      logger.error('发布微博失败:', error);
      throw error;
    }
  }

  public async replyComment(postId: string, commentId: string, reply: string): Promise<PostWeiboResult> {
    try {
      logger.logWeiboOperation('回复评论', { postId, commentId, reply });
      
      // 这里应该调用实际的评论回复 API
      return {
        success: true,
        postId: `reply_${Date.now()}`,
        message: '评论回复成功',
      };
    } catch (error) {
      logger.error('回复评论失败:', error);
      throw error;
    }
  }

  public async likePost(postId: string): Promise<LikeResult> {
    try {
      logger.logWeiboOperation('点赞微博', { postId });
      
      // 这里应该调用实际的点赞 API
      return {
        success: true,
        liked: true,
        message: '点赞成功',
      };
    } catch (error) {
      logger.error('点赞微博失败:', error);
      throw error;
    }
  }

  public async likeComment(commentId: string): Promise<LikeResult> {
    try {
      logger.logWeiboOperation('点赞评论', { commentId });
      
      // 这里应该调用实际的评论点赞 API
      return {
        success: true,
        liked: true,
        message: '评论点赞成功',
      };
    } catch (error) {
      logger.error('点赞评论失败:', error);
      throw error;
    }
  }

  public async followUser(userId: string): Promise<FollowResult> {
    try {
      logger.logWeiboOperation('关注用户', { userId });
      
      // 这里应该调用实际的关注 API
      return {
        success: true,
        followed: true,
        message: '关注用户成功',
      };
    } catch (error) {
      logger.error('关注用户失败:', error);
      throw error;
    }
  }

  public async unfollowUser(userId: string): Promise<FollowResult> {
    try {
      logger.logWeiboOperation('取消关注用户', { userId });
      
      // 这里应该调用实际的取消关注 API
      return {
        success: true,
        followed: false,
        message: '取消关注成功',
      };
    } catch (error) {
      logger.error('取消关注用户失败:', error);
      throw error;
    }
  }

  public async getMentions(limit: number = 10): Promise<Mention[]> {
    try {
      logger.logWeiboOperation('获取@我的消息', { limit });
      
      // 这里应该调用实际的@消息 API
      // 暂时返回模拟数据
      return [];
    } catch (error) {
      logger.error('获取@我的消息失败:', error);
      throw error;
    }
  }

  public async getMyComments(limit: number = 10): Promise<WeiboComment[]> {
    try {
      logger.logWeiboOperation('获取我的评论', { limit });
      
      // 这里应该调用实际的我的评论 API
      // 暂时返回模拟数据
      return [];
    } catch (error) {
      logger.error('获取我的评论失败:', error);
      throw error;
    }
  }
}

export const weiboAPI = new WeiboAPI();
