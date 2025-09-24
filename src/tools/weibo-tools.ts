import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger';
import { configManager } from '../utils/config';
import { weiboAPI } from '../api/weibo-api';

export interface PostWeiboParams {
  content: string;
  images?: string[];
  location?: string;
}

export interface ReplyCommentParams {
  postId: string;
  commentId: string;
  reply: string;
}

export interface LikePostParams {
  postId: string;
}

export interface LikeCommentParams {
  commentId: string;
}

export interface FollowUserParams {
  userId: string;
}

export interface UnfollowUserParams {
  userId: string;
}

export interface GetMentionsParams {
  limit?: number;
}

export interface GetMyCommentsParams {
  limit?: number;
}

class WeiboTools {
  private tools: Tool[] = [
    {
      name: 'post_weibo',
      description: '发布微博内容',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: '微博内容',
          },
          images: {
            type: 'array',
            items: { type: 'string' },
            description: '图片路径列表（可选）',
          },
          location: {
            type: 'string',
            description: '位置信息（可选）',
          },
        },
        required: ['content'],
      },
    },
    {
      name: 'reply_comment',
      description: '智能回复评论',
      inputSchema: {
        type: 'object',
        properties: {
          postId: {
            type: 'string',
            description: '微博 ID',
          },
          commentId: {
            type: 'string',
            description: '评论 ID',
          },
          reply: {
            type: 'string',
            description: '回复内容',
          },
        },
        required: ['postId', 'commentId', 'reply'],
      },
    },
    {
      name: 'like_post',
      description: '点赞微博',
      inputSchema: {
        type: 'object',
        properties: {
          postId: {
            type: 'string',
            description: '微博 ID',
          },
        },
        required: ['postId'],
      },
    },
    {
      name: 'like_comment',
      description: '点赞评论',
      inputSchema: {
        type: 'object',
        properties: {
          commentId: {
            type: 'string',
            description: '评论 ID',
          },
        },
        required: ['commentId'],
      },
    },
    {
      name: 'follow_user',
      description: '关注用户',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: '用户 ID',
          },
        },
        required: ['userId'],
      },
    },
    {
      name: 'unfollow_user',
      description: '取消关注用户',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: '用户 ID',
          },
        },
        required: ['userId'],
      },
    },
    {
      name: 'get_mentions',
      description: '获取@我的消息',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '返回结果数量限制，默认 10',
            default: 10,
          },
        },
      },
    },
    {
      name: 'get_my_comments',
      description: '获取我的评论',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '返回结果数量限制，默认 10',
            default: 10,
          },
        },
      },
    },
    {
      name: 'get_status',
      description: '获取生活助理状态',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];

  public getAvailableTools(): Tool[] {
    return this.tools;
  }

  public async executeTool(name: string, args: any): Promise<CallToolResult> {
    logger.logWeiboOperation(`执行生活助理功能: ${name}`, args);

    switch (name) {
      case 'post_weibo':
        return await this.postWeibo(args as PostWeiboParams);
      
      case 'reply_comment':
        return await this.replyComment(args as ReplyCommentParams);
      
      case 'like_post':
        return await this.likePost(args as LikePostParams);
      
      case 'like_comment':
        return await this.likeComment(args as LikeCommentParams);
      
      case 'follow_user':
        return await this.followUser(args as FollowUserParams);
      
      case 'unfollow_user':
        return await this.unfollowUser(args as UnfollowUserParams);
      
      case 'get_mentions':
        return await this.getMentions(args as GetMentionsParams);
      
      case 'get_my_comments':
        return await this.getMyComments(args as GetMyCommentsParams);
      
      case 'get_status':
        return await this.getStatus();
      
      default:
        throw new Error(`未知的生活助理功能: ${name}`);
    }
  }

  private async postWeibo(params: PostWeiboParams): Promise<CallToolResult> {
    const { content, images, location } = params;
    
    try {
      const result = await weiboAPI.postWeibo(content, images, location);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: result,
              message: '微博发布成功',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('发布微博失败:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '未知错误',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  private async replyComment(params: ReplyCommentParams): Promise<CallToolResult> {
    const { postId, commentId, reply } = params;
    
    try {
      const result = await weiboAPI.replyComment(postId, commentId, reply);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: result,
              message: '评论回复成功',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('回复评论失败:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '未知错误',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  private async likePost(params: LikePostParams): Promise<CallToolResult> {
    const { postId } = params;
    
    try {
      const result = await weiboAPI.likePost(postId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: result,
              message: '点赞成功',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('点赞失败:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '未知错误',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  private async likeComment(params: LikeCommentParams): Promise<CallToolResult> {
    const { commentId } = params;
    
    try {
      const result = await weiboAPI.likeComment(commentId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: result,
              message: '评论点赞成功',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('评论点赞失败:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '未知错误',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  private async followUser(params: FollowUserParams): Promise<CallToolResult> {
    const { userId } = params;
    
    try {
      const result = await weiboAPI.followUser(userId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: result,
              message: '关注用户成功',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('关注用户失败:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '未知错误',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  private async unfollowUser(params: UnfollowUserParams): Promise<CallToolResult> {
    const { userId } = params;
    
    try {
      const result = await weiboAPI.unfollowUser(userId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: result,
              message: '取消关注成功',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('取消关注失败:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '未知错误',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  private async getMentions(params: GetMentionsParams): Promise<CallToolResult> {
    const { limit = 10 } = params;
    
    try {
      const mentions = await weiboAPI.getMentions(limit);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: mentions,
              meta: {
                limit,
                count: mentions.length,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('获取@我的消息失败:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '未知错误',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  private async getMyComments(params: GetMyCommentsParams): Promise<CallToolResult> {
    const { limit = 10 } = params;
    
    try {
      const comments = await weiboAPI.getMyComments(limit);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: comments,
              meta: {
                limit,
                count: comments.length,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('获取我的评论失败:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '未知错误',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  private async getStatus(): Promise<CallToolResult> {
    const config = configManager.getConfig();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              service: '微博生活助理',
              authenticated: configManager.isWeiboAuthenticated(),
              mcpServer: {
                port: config.mcp.port,
                host: config.mcp.host,
              },
              weibo: {
                hasAccessToken: !!config.weibo.accessToken,
                hasCookie: !!config.weibo.cookie,
                rateLimit: config.weibo.rateLimit,
                userBehavior: config.weibo.userBehavior,
              },
              browserFingerprint: config.weibo.browserFingerprint,
              paths: {
                dataDir: config.dataDir,
                exportDir: config.exportDir,
                logFile: config.logFile,
              },
            },
          }, null, 2),
        },
      ],
    };
  }
}

export const weiboTools = new WeiboTools();
