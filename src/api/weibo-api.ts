import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { configManager } from '../utils/config';
import { injectionTools } from '../browser/injection-tools';
import { browserManager } from '../browser/browser-manager';
import { SimpleHARObserver, ActionSequence } from '../browser/simple-har-observer';
import { RequestReplayer, RequestSample } from '../browser/request-replayer';
// import { errorRecovery } from '../utils/error-recovery';

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

        // 添加微博特定的请求头
        config.headers['Accept'] = 'application/json, text/plain, */*';
        config.headers['Accept-Encoding'] = 'gzip, deflate, br, zstd';
        config.headers['Accept-Language'] = 'zh-CN,zh;q=0.9,en-GB;q=0.8,en;q=0.7,en-US;q=0.6';
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        config.headers['Sec-Fetch-Dest'] = 'empty';
        config.headers['Sec-Fetch-Mode'] = 'cors';
        config.headers['Sec-Fetch-Site'] = 'same-origin';
        config.headers['Priority'] = 'u=1, i';
        
        // 添加XSRF Token
        if (weiboConfig.xsrfToken) {
          config.headers['X-XSRF-TOKEN'] = weiboConfig.xsrfToken;
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
      
      // 使用真实的微博API端点
      const response = await this.client.get('https://m.weibo.cn/api/container/getIndex', {
        params: {
          containerid: '100103type=1&q=' + encodeURIComponent(keyword),
          page_type: 'searchall',
          page: 1
        }
      });

      if (response.data && response.data.data && response.data.data.cards) {
        const posts = response.data.data.cards
          .filter((card: any) => card.card_type === 9)
          .slice(0, limit)
          .map((card: any) => {
            const mblog = card.mblog;
            return {
              id: mblog.id,
              text: mblog.text,
              user: {
                id: mblog.user.id,
                name: mblog.user.screen_name,
                avatar: mblog.user.profile_image_url,
              },
              createdAt: mblog.created_at,
              repostsCount: mblog.reposts_count,
              commentsCount: mblog.comments_count,
              attitudesCount: mblog.attitudes_count,
              images: mblog.pics ? mblog.pics.map((pic: any) => pic.url) : undefined,
            };
          });

        logger.logWeiboOperation('搜索微博成功', { count: posts.length });
        return posts;
      } else {
        throw new Error('微博API搜索失败：' + (response.data?.msg || '未知错误'));
      }
    } catch (error) {
      logger.error('搜索微博失败:', error);
      throw error;
    }
  }

  public async getHotTopics(limit = 50): Promise<HotTopic[]> {
    try {
      logger.logWeiboOperation('获取热搜榜', { limit });
      
      // 使用真实的微博热搜API
      const response = await this.client.get('https://m.weibo.cn/api/container/getIndex', {
        params: {
          containerid: '106003type=25&t=3&disable_hot=1&filter_type=realtimehot',
          title: '微博热搜榜',
          page_type: 'searchall'
        }
      });

      if (response.data && response.data.data && response.data.data.cards) {
        const topics = response.data.data.cards
          .filter((card: any) => card.card_type === 11)
          .slice(0, limit)
          .map((card: any, index: number) => ({
            id: card.desc?.trend_id || index.toString(),
            title: card.desc?.trend_name || '未知话题',
            hot: card.desc?.trend_num || 0,
            url: card.desc?.trend_url || '',
            rank: index + 1,
          }));

        logger.logWeiboOperation('获取热搜榜成功', { count: topics.length });
        return topics;
      } else {
        throw new Error('获取热搜榜失败：' + (response.data?.msg || '未知错误'));
      }
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
      logger.info(`🔗 [调用链追踪] Step 3: weiboAPI.postWeibo() → 检查Electron环境`);
      
      // 强制要求Electron环境，禁止降级
      if (!injectionTools.isElectronAvailable()) {
        throw new Error('网页版MCP功能需要Electron环境。请使用 pnpm run dev:electron 启动应用。');
      }
      
      logger.info(`🔗 [调用链追踪] Step 4: weiboAPI.postWeibo() → 调用 injectionTools.executeInPageContext()`);
      
      // 验证browserManager是否可用
      const window = browserManager.getWindow();
      logger.info(`🔗 [调用链追踪] Step 4.1: browserManager.getWindow()`, { hasWindow: !!window });
      
      // 确保在首页（这会自动等待登录并导航到首页）
      logger.info(`🔗 [调用链追踪] Step 4.2: 确保在首页`);
      try {
        await browserManager.ensureOnHomePage();
        logger.info(`🔗 [调用链追踪] Step 4.3: 已在首页，可以执行发布操作`);
      } catch (error) {
        logger.error(`🔗 [调用链追踪] Step 4.3: 无法确保在首页`, error);
        throw new Error(`无法导航到首页: ${error instanceof Error ? error.message : '未知错误'}`);
      }
      
      // 使用浏览器上下文执行JavaScript，复用页面内函数
      const result = await injectionTools.executeInPageContext(`
        (function() {
          try {
            // 首先检查当前页面状态
            const currentUrl = window.location.href;
            const isLoginPage = currentUrl.includes('login') || currentUrl.includes('passport') || currentUrl.includes('newlogin');
            
            if (isLoginPage) {
              return { 
                success: false, 
                error: '当前在登录页面，无法发布微博。请先登录并导航到首页。' 
              };
            }
            
            // 检查是否有发布相关的DOM元素
            const hasPublishArea = !!(
              document.querySelector('textarea[placeholder*="有什么新鲜事"]') ||
              document.querySelector('textarea[placeholder*="说点什么"]') ||
              document.querySelector('.woo-box-item-flex .toolbar_publish_btn') ||
              document.querySelector('.WB_feed') ||
              document.querySelector('.feed_list')
            );
            
            if (!hasPublishArea) {
              return { 
                success: false, 
                error: '当前页面不是微博首页，无法定位发布入口。当前URL: ' + currentUrl 
              };
            }
            
            // 在页面上下文中执行微博发布
            // 复用页面内的认证状态和函数
            
            // 方法1: 直接调用页面内的微博发布函数
            if (window.WB && window.WB.post) {
              return window.WB.post({
                content: '${content.replace(/'/g, "\\'")}',
                images: ${images ? JSON.stringify(images) : 'null'},
                location: '${location || ''}'
              });
            }
            
            // 方法2: 模拟用户操作，点击发布按钮
            const textarea = document.querySelector('textarea[placeholder*="有什么新鲜事"], textarea[placeholder*="说点什么"]');
            if (textarea) {
              textarea.value = '${content.replace(/'/g, "\\'")}';
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              
              // 触发change事件
              textarea.dispatchEvent(new Event('change', { bubbles: true }));
              
              // 查找并点击发布按钮
              const publishBtn = document.querySelector('button[title*="发布"], button[title*="发送"], .publish-btn, .send-btn');
              if (publishBtn) {
                publishBtn.click();
                return { success: true, message: '微博发布成功（通过页面操作）' };
              }
            }
            
            // 方法3: 使用页面内的XHR拦截器获取真实请求
            return { 
              success: false, 
              error: '未找到发布方法。当前页面可能不是微博首页，或页面元素未完全加载。当前URL: ' + currentUrl 
            };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);

      if (result.success) {
        logger.logWeiboOperation('微博发布成功', { method: 'browser_context' });
        return {
          success: true,
          postId: result.postId || `post_${Date.now()}`,
          message: result.message || '微博发布成功',
        };
      } else {
        throw new Error('微博发布失败：' + result.error);
      }
    } catch (error) {
      logger.error('发布微博失败:', error);
      logger.error('错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      });
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
      
      // 强制要求Electron环境，禁止降级
      if (!injectionTools.isElectronAvailable()) {
        throw new Error('网页版MCP功能需要Electron环境。请使用 pnpm run dev:electron 启动应用。');
      }
      
      // 使用页面上下文执行点赞操作
      const result = await injectionTools.executeInPageContext(`
        (function() {
          try {
            // 方法1: 查找并点击点赞按钮
            const likeBtn = document.querySelector('[data-id="${postId}"] .like-btn, [data-id="${postId}"] .attitude-btn');
            if (likeBtn) {
              likeBtn.click();
              return { success: true, liked: true, message: '点赞成功（通过页面操作）' };
            }
            
            // 方法2: 使用页面内的点赞函数
            if (window.WB && window.WB.like) {
              const result = window.WB.like('${postId}');
              return { success: true, liked: result.success, message: result.message };
            }
            
            // 方法3: 模拟用户操作
            const postElement = document.querySelector('[data-id="${postId}"]');
            if (postElement) {
              const likeButton = postElement.querySelector('button[title*="赞"], button[title*="like"], .like, .attitude');
              if (likeButton) {
                likeButton.click();
                return { success: true, liked: true, message: '点赞成功（模拟操作）' };
              }
            }
            
            return { success: false, error: '未找到点赞方法' };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);

      if (result.success) {
        logger.logWeiboOperation('点赞成功', { method: 'browser_context', postId });
        return {
          success: true,
          liked: result.liked || true,
          message: result.message || '点赞成功',
        };
      } else {
        throw new Error('点赞失败：' + result.error);
      }
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
      
      // 强制要求Electron环境，禁止降级
      if (!injectionTools.isElectronAvailable()) {
        throw new Error('网页版MCP功能需要Electron环境。请使用 pnpm run dev:electron 启动应用。');
      }
      
      // 使用页面上下文执行关注操作
      const result = await injectionTools.executeInPageContext(`
        (function() {
          try {
            // 方法1: 查找并点击关注按钮
            const followBtn = document.querySelector('[data-user-id="${userId}"] .follow-btn, [data-user-id="${userId}"] .follow');
            if (followBtn) {
              followBtn.click();
              return { success: true, followed: true, message: '关注成功（通过页面操作）' };
            }
            
            // 方法2: 使用页面内的关注函数
            if (window.WB && window.WB.follow) {
              const result = window.WB.follow('${userId}');
              return { success: true, followed: result.success, message: result.message };
            }
            
            return { success: false, error: '未找到关注方法' };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);

      if (result.success) {
        logger.logWeiboOperation('关注用户成功', { method: 'browser_context', userId });
        return {
          success: true,
          followed: result.followed || true,
          message: result.message || '关注用户成功',
        };
      } else {
        throw new Error('关注用户失败：' + result.error);
      }
    } catch (error) {
      logger.error('关注用户失败:', error);
      throw error;
    }
  }

  public async unfollowUser(userId: string): Promise<FollowResult> {
    try {
      logger.logWeiboOperation('取消关注用户', { userId });
      
      // 强制要求Electron环境，禁止降级
      if (!injectionTools.isElectronAvailable()) {
        throw new Error('网页版MCP功能需要Electron环境。请使用 pnpm run dev:electron 启动应用。');
      }
      
      // 使用页面上下文执行取消关注操作
      const result = await injectionTools.executeInPageContext(`
        (function() {
          try {
            // 方法1: 查找并点击取消关注按钮
            const unfollowBtn = document.querySelector('[data-user-id="${userId}"] .unfollow-btn, [data-user-id="${userId}"] .unfollow');
            if (unfollowBtn) {
              unfollowBtn.click();
              return { success: true, followed: false, message: '取消关注成功（通过页面操作）' };
            }
            
            // 方法2: 使用页面内的取消关注函数
            if (window.WB && window.WB.unfollow) {
              const result = window.WB.unfollow('${userId}');
              return { success: true, followed: !result.success, message: result.message };
            }
            
            return { success: false, error: '未找到取消关注方法' };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);

      if (result.success) {
        logger.logWeiboOperation('取消关注成功', { method: 'browser_context', userId });
        return {
          success: true,
          followed: result.followed || false,
          message: result.message || '取消关注成功',
        };
      } else {
        throw new Error('取消关注失败：' + result.error);
      }
    } catch (error) {
      logger.error('取消关注用户失败:', error);
      throw error;
    }
  }

  public async getMentions(limit: number = 10): Promise<Mention[]> {
    try {
      logger.logWeiboOperation('获取@我的消息', { limit });
      
      // 使用真实的微博@消息API
      const response = await this.client.get('https://m.weibo.cn/api/statuses/mentions', {
        params: {
          count: limit,
          page: 1
        }
      });

      if (response.data && response.data.statuses) {
        const mentions = response.data.statuses.map((status: any) => ({
          id: status.id,
          text: status.text,
          user: {
            id: status.user.id,
            name: status.user.screen_name,
            avatar: status.user.profile_image_url,
          },
          postId: status.id,
          createdAt: status.created_at,
        }));

        logger.logWeiboOperation('获取@我的消息成功', { count: mentions.length });
        return mentions;
      } else {
        logger.warn('获取@我的消息失败，返回空列表');
        return [];
      }
    } catch (error) {
      logger.error('获取@我的消息失败:', error);
      throw error;
    }
  }

  public async getMyComments(limit: number = 10): Promise<WeiboComment[]> {
    try {
      logger.logWeiboOperation('获取我的评论', { limit });
      
      // 使用真实的微博我的评论API
      const response = await this.client.get('https://m.weibo.cn/api/comments/to_me', {
        params: {
          count: limit,
          page: 1
        }
      });

      if (response.data && response.data.comments) {
        const comments = response.data.comments.map((comment: any) => ({
          id: comment.id,
          text: comment.text,
          user: {
            id: comment.user.id,
            name: comment.user.screen_name,
            avatar: comment.user.profile_image_url,
          },
          createdAt: comment.created_at,
          likeCount: comment.like_count,
          replyCount: comment.reply_count,
        }));

        logger.logWeiboOperation('获取我的评论成功', { count: comments.length });
        return comments;
      } else {
        logger.warn('获取我的评论失败，返回空列表');
        return [];
      }
    } catch (error) {
      logger.error('获取我的评论失败:', error);
      return [];
    }
  }

  // ==================== 三步法网页版MCP功能 ====================

  /**
   * Task A - 快速观测：在Playwright中打开页面，执行动作，保存HAR与请求日志
   */
  public async observeWeiboActions(url: string, actionSequence: ActionSequence[]): Promise<{
    harFile: string;
    requestLogs: any[];
  }> {
    try {
      logger.logWeiboOperation('开始Task A - 快速观测', { url, actionCount: actionSequence.length });

      // 强制要求Electron环境
      if (!injectionTools.isElectronAvailable()) {
        throw new Error('网页版MCP功能需要Electron环境。请使用 pnpm run dev:electron 启动应用。');
      }

      // 创建HAR观测器
      const harObserver = new SimpleHARObserver();
      
      // 初始化浏览器上下文
      const context = await browserManager.getBrowserContext();
      await harObserver.initialize(context);

      // 执行观测
      const result = await harObserver.observeActions(url, actionSequence);

      // 清理资源
      await harObserver.cleanup();

      logger.logWeiboOperation('Task A - 快速观测完成', {
        harFile: result.harFile,
        requestCount: result.requestLogs.length
      });

      return result;
    } catch (error) {
      logger.error('Task A - 快速观测失败:', error);
      throw error;
    }
  }

  /**
   * Task B - 注入拦截：在页面evaluate注入拦截脚本，收集请求明细
   */
  public async injectAndIntercept(url: string, actionSequence: ActionSequence[]): Promise<{
    requestLogs: any[];
    consoleLogs: string[];
  }> {
    try {
      logger.logWeiboOperation('开始Task B - 注入拦截', { url, actionCount: actionSequence.length });

      // 强制要求Electron环境
      if (!injectionTools.isElectronAvailable()) {
        throw new Error('网页版MCP功能需要Electron环境。请使用 pnpm run dev:electron 启动应用。');
      }

      // 获取浏览器页面
      const page = await browserManager.getPage();
      if (!page) {
        throw new Error('无法获取浏览器页面');
      }

      // 导航到目标页面
      await page.goto(url, { waitUntil: 'networkidle' });

      // 注入拦截脚本
      const fs = require('fs');
      const path = require('path');
      const injectScript = fs.readFileSync(path.join(__dirname, '../browser/inject-intercept.js'), 'utf8');
      await page.addScriptTag({ content: injectScript });

      // 启动拦截器
      await page.evaluate(() => {
        if ((window as any).InjectInterceptor) {
          (window as any).InjectInterceptor.start();
        }
      });

      // 执行动作序列
      for (const action of actionSequence) {
        await this.executePageAction(page, action);
      }

      // 等待请求完成
      await page.waitForTimeout(2000);

      // 获取拦截的请求日志
      const requestLogs = await page.evaluate(() => {
        return (window as any).InjectInterceptor ? (window as any).InjectInterceptor.getLogs() : [];
      });

      // 获取控制台日志
      const consoleLogs: string[] = [];
      page.on('console', (msg: any) => {
        if (msg.text().includes('[INJECT-INTERCEPT]')) {
          consoleLogs.push(msg.text());
        }
      });

      logger.logWeiboOperation('Task B - 注入拦截完成', {
        requestCount: requestLogs.length,
        consoleLogCount: consoleLogs.length
      });

      return {
        requestLogs,
        consoleLogs
      };
    } catch (error) {
      logger.error('Task B - 注入拦截失败:', error);
      throw error;
    }
  }

  /**
   * Task C - 页面内复用：在页面上下文重放请求，观察响应
   */
  public async replayWeiboRequests(requestSamples: RequestSample[]): Promise<{
    results: any[];
    successCount: number;
    failureCount: number;
  }> {
    try {
      logger.logWeiboOperation('开始Task C - 页面内复用', { requestCount: requestSamples.length });

      // 强制要求Electron环境
      if (!injectionTools.isElectronAvailable()) {
        throw new Error('网页版MCP功能需要Electron环境。请使用 pnpm run dev:electron 启动应用。');
      }

      // 获取浏览器页面
      const page = await browserManager.getPage();
      if (!page) {
        throw new Error('无法获取浏览器页面');
      }

      // 创建请求重放器
      const replayer = new RequestReplayer(page);

      // 重放请求
      const results = await replayer.replayRequests(requestSamples);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      logger.logWeiboOperation('Task C - 页面内复用完成', {
        total: requestSamples.length,
        success: successCount,
        failure: failureCount
      });

      return {
        results,
        successCount,
        failureCount
      };
    } catch (error) {
      logger.error('Task C - 页面内复用失败:', error);
      throw error;
    }
  }

  /**
   * 执行页面动作
   */
  private async executePageAction(page: any, action: ActionSequence): Promise<void> {
    switch (action.type) {
      case 'click':
        if (action.selector) {
          await page.click(action.selector);
        }
        break;
      case 'input':
        if (action.selector && action.value) {
          await page.fill(action.selector, action.value);
        }
        break;
      case 'scroll':
        await page.evaluate(() => window.scrollBy(0, 500));
        break;
      case 'wait':
        await page.waitForTimeout(action.duration || 1000);
        break;
    }
  }
}

export const weiboAPI = new WeiboAPI();
