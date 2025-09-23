import { logger } from '../utils/logger';
import { browserManager } from './browser-manager';

export interface InjectionResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface WeiboData {
  posts: WeiboPost[];
  users: WeiboUser[];
  topics: WeiboTopic[];
}

export interface WeiboPost {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  createdAt: string;
  repostsCount: number;
  commentsCount: number;
  attitudesCount: number;
  images?: string[];
  video?: string;
}

export interface WeiboUser {
  id: string;
  name: string;
  avatar: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
}

export interface WeiboTopic {
  id: string;
  title: string;
  hot: number;
  url: string;
  rank: number;
}

class InjectionTools {
  private injectionScripts: Map<string, string> = new Map();

  constructor() {
    this.initializeInjectionScripts();
  }

  private initializeInjectionScripts(): void {
    // 搜索微博脚本
    this.injectionScripts.set('search_posts', `
      (function(keyword, limit = 20, sort = 'time') {
        try {
          const results = [];
          const posts = document.querySelectorAll('.WB_feed_detail, .m-wrap, .feed_list .WB_feed');
          
          for (let i = 0; i < Math.min(posts.length, limit); i++) {
            const post = posts[i];
            const textEl = post.querySelector('.WB_text, .txt, .feed_txt');
            const authorEl = post.querySelector('.W_f14, .name, .username');
            const avatarEl = post.querySelector('.face img, .avatar img');
            const timeEl = post.querySelector('.from, .time, .date');
            
            if (textEl && authorEl) {
              const repostsEl = post.querySelector('.handle .forward, .repost');
              const commentsEl = post.querySelector('.handle .comment');
              const attitudesEl = post.querySelector('.handle .like, .attitude');
              
              results.push({
                id: post.getAttribute('data-id') || 'unknown',
                text: textEl.textContent.trim(),
                author: {
                  id: authorEl.getAttribute('data-user-id') || 'unknown',
                  name: authorEl.textContent.trim(),
                  avatar: avatarEl ? avatarEl.src : ''
                },
                createdAt: timeEl ? timeEl.textContent.trim() : new Date().toISOString(),
                repostsCount: repostsEl ? parseInt(repostsEl.textContent) || 0 : 0,
                commentsCount: commentsEl ? parseInt(commentsEl.textContent) || 0 : 0,
                attitudesCount: attitudesEl ? parseInt(attitudesEl.textContent) || 0 : 0
              });
            }
          }
          
          return { success: true, data: results, count: results.length };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })
    `);

    // 获取热搜榜脚本
    this.injectionScripts.set('get_hot_topics', `
      (function(limit = 50) {
        try {
          const results = [];
          const topics = document.querySelectorAll('.hot_list .hot_item, .trend_list .trend_item, .hot_rank .rank_item');
          
          for (let i = 0; i < Math.min(topics.length, limit); i++) {
            const topic = topics[i];
            const titleEl = topic.querySelector('.hot_title, .trend_title, .rank_title');
            const hotEl = topic.querySelector('.hot_num, .trend_num, .rank_num');
            const linkEl = topic.querySelector('a');
            
            if (titleEl) {
              results.push({
                id: 'topic_' + i,
                title: titleEl.textContent.trim(),
                hot: hotEl ? parseInt(hotEl.textContent.replace(/[^0-9]/g, '')) || 0 : 0,
                url: linkEl ? linkEl.href : '',
                rank: i + 1
              });
            }
          }
          
          return { success: true, data: results, count: results.length };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })
    `);

    // 获取评论脚本
    this.injectionScripts.set('get_comments', `
      (function(postId, limit = 20) {
        try {
          const results = [];
          const comments = document.querySelectorAll('.comment_list .comment_item, .reply_list .reply_item');
          
          for (let i = 0; i < Math.min(comments.length, limit); i++) {
            const comment = comments[i];
            const textEl = comment.querySelector('.comment_txt, .reply_txt');
            const authorEl = comment.querySelector('.comment_name, .reply_name');
            const avatarEl = comment.querySelector('.comment_avatar img, .reply_avatar img');
            const timeEl = comment.querySelector('.comment_time, .reply_time');
            const likeEl = comment.querySelector('.comment_like, .reply_like');
            
            if (textEl && authorEl) {
              results.push({
                id: comment.getAttribute('data-id') || 'comment_' + i,
                text: textEl.textContent.trim(),
                user: {
                  id: authorEl.getAttribute('data-user-id') || 'unknown',
                  name: authorEl.textContent.trim(),
                  avatar: avatarEl ? avatarEl.src : ''
                },
                createdAt: timeEl ? timeEl.textContent.trim() : new Date().toISOString(),
                likeCount: likeEl ? parseInt(likeEl.textContent) || 0 : 0,
                replyCount: 0
              });
            }
          }
          
          return { success: true, data: results, count: results.length };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })
    `);

    // 检查登录状态脚本
    this.injectionScripts.set('check_login', `
      (function() {
        try {
          const userInfo = document.querySelector('[data-user-id]') || 
                          document.querySelector('.gn_name') ||
                          document.querySelector('.username');
          
          const avatar = document.querySelector('.gn_avatar img') || 
                        document.querySelector('.avatar img');
          
          return {
            success: true,
            data: {
              isLoggedIn: !!userInfo,
              username: userInfo ? userInfo.textContent.trim() : null,
              avatar: avatar ? avatar.src : null
            }
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })
    `);

    // 获取用户信息脚本
    this.injectionScripts.set('get_user_info', `
      (function(userId) {
        try {
          const userEl = document.querySelector('[data-user-id="' + userId + '"]') ||
                        document.querySelector('.user_info');
          
          if (!userEl) {
            return { success: false, error: '用户信息未找到' };
          }
          
          const nameEl = userEl.querySelector('.name, .username');
          const avatarEl = userEl.querySelector('.avatar img');
          const followersEl = userEl.querySelector('.followers, .fans');
          const followingEl = userEl.querySelector('.following, .follow');
          const postsEl = userEl.querySelector('.posts, .weibo');
          const verifiedEl = userEl.querySelector('.verified, .vip');
          
          return {
            success: true,
            data: {
              id: userId,
              name: nameEl ? nameEl.textContent.trim() : '',
              avatar: avatarEl ? avatarEl.src : '',
              followersCount: followersEl ? parseInt(followersEl.textContent.replace(/[^0-9]/g, '')) || 0 : 0,
              followingCount: followingEl ? parseInt(followingEl.textContent.replace(/[^0-9]/g, '')) || 0 : 0,
              postsCount: postsEl ? parseInt(postsEl.textContent.replace(/[^0-9]/g, '')) || 0 : 0,
              verified: !!verifiedEl
            }
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })
    `);
  }

  public async searchPosts(keyword: string, limit = 20, sort: 'time' | 'hot' = 'time'): Promise<InjectionResult> {
    try {
      logger.info('开始搜索微博', { keyword, limit, sort });
      
      // 导航到搜索页面
      await this.navigateToSearch(keyword, sort);
      
      // 等待页面加载
      await this.waitForPageLoad();
      
      // 执行搜索脚本
      const script = this.injectionScripts.get('search_posts');
      if (!script) {
        throw new Error('搜索脚本未找到');
      }
      
      const result = await browserManager.executeJavaScript(`(${script})("${keyword}", ${limit}, "${sort}")`);
      
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('搜索微博失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: Date.now(),
      };
    }
  }

  public async getHotTopics(limit = 50): Promise<InjectionResult> {
    try {
      logger.info('开始获取热搜榜', { limit });
      
      // 导航到热搜页面
      await this.navigateToHotTopics();
      
      // 等待页面加载
      await this.waitForPageLoad();
      
      // 执行热搜脚本
      const script = this.injectionScripts.get('get_hot_topics');
      if (!script) {
        throw new Error('热搜脚本未找到');
      }
      
      const result = await browserManager.executeJavaScript(`(${script})(${limit})`);
      
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('获取热搜榜失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: Date.now(),
      };
    }
  }

  public async getComments(postId: string, limit = 20): Promise<InjectionResult> {
    try {
      logger.info('开始获取评论', { postId, limit });
      
      // 导航到微博详情页面
      await this.navigateToPost(postId);
      
      // 等待页面加载
      await this.waitForPageLoad();
      
      // 执行评论脚本
      const script = this.injectionScripts.get('get_comments');
      if (!script) {
        throw new Error('评论脚本未找到');
      }
      
      const result = await browserManager.executeJavaScript(`(${script})("${postId}", ${limit})`);
      
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('获取评论失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: Date.now(),
      };
    }
  }

  public async checkLoginStatus(): Promise<InjectionResult> {
    try {
      logger.info('检查登录状态');
      
      const script = this.injectionScripts.get('check_login');
      if (!script) {
        throw new Error('登录检查脚本未找到');
      }
      
      const result = await browserManager.executeJavaScript(`(${script})()`);
      
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('检查登录状态失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: Date.now(),
      };
    }
  }

  public async getUserInfo(userId: string): Promise<InjectionResult> {
    try {
      logger.info('获取用户信息', { userId });
      
      // 导航到用户页面
      await this.navigateToUser(userId);
      
      // 等待页面加载
      await this.waitForPageLoad();
      
      // 执行用户信息脚本
      const script = this.injectionScripts.get('get_user_info');
      if (!script) {
        throw new Error('用户信息脚本未找到');
      }
      
      const result = await browserManager.executeJavaScript(`(${script})("${userId}")`);
      
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: Date.now(),
      };
    }
  }

  private async navigateToSearch(keyword: string, sort: 'time' | 'hot'): Promise<void> {
    const searchUrl = `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}&typeall=1&suball=1&timescope=custom:2024-01-01-0:2024-12-31-23&Refer=g&sort=${sort}`;
    await browserManager.executeJavaScript(`window.location.href = "${searchUrl}"`);
  }

  private async navigateToHotTopics(): Promise<void> {
    await browserManager.executeJavaScript(`window.location.href = "https://s.weibo.com/top/summary"`);
  }

  private async navigateToPost(postId: string): Promise<void> {
    const postUrl = `https://weibo.com/${postId}`;
    await browserManager.executeJavaScript(`window.location.href = "${postUrl}"`);
  }

  private async navigateToUser(userId: string): Promise<void> {
    const userUrl = `https://weibo.com/u/${userId}`;
    await browserManager.executeJavaScript(`window.location.href = "${userUrl}"`);
  }

  private async waitForPageLoad(timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkLoad = async () => {
        try {
          const readyState = await browserManager.executeJavaScript('document.readyState');
          if (readyState === 'complete') {
            // 额外等待一下确保动态内容加载完成
            setTimeout(resolve, 1000);
            return;
          }
          
          if (Date.now() - startTime > timeout) {
            reject(new Error('页面加载超时'));
            return;
          }
          
          setTimeout(checkLoad, 500);
        } catch (error) {
          reject(error);
        }
      };
      
      checkLoad();
    });
  }

  public getAvailableScripts(): string[] {
    return Array.from(this.injectionScripts.keys());
  }
}

export const injectionTools = new InjectionTools();
