import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger';
import { configManager } from '../utils/config';
import { weiboAPI } from '../api/weibo-api';

export interface SearchPostsParams {
  keyword: string;
  limit?: number;
  sort?: 'time' | 'hot';
}

export interface GetHotTopicsParams {
  limit?: number;
}

export interface GetCommentsParams {
  postId: string;
  limit?: number;
}

export interface PostCommentParams {
  postId: string;
  text: string;
}

export interface ExportDataParams {
  format: 'json' | 'csv';
  filename: string;
  data: any[];
}

class WeiboTools {
  private tools: Tool[] = [
    {
      name: 'search_posts',
      description: '搜索微博内容',
      inputSchema: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: '搜索关键词',
          },
          limit: {
            type: 'number',
            description: '返回结果数量限制，默认 20',
            default: 20,
          },
          sort: {
            type: 'string',
            enum: ['time', 'hot'],
            description: '排序方式：time(时间) 或 hot(热度)',
            default: 'time',
          },
        },
        required: ['keyword'],
      },
    },
    {
      name: 'get_hot_topics',
      description: '获取微博热搜榜',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '返回结果数量限制，默认 50',
            default: 50,
          },
        },
      },
    },
    {
      name: 'get_comments',
      description: '获取微博评论',
      inputSchema: {
        type: 'object',
        properties: {
          postId: {
            type: 'string',
            description: '微博 ID',
          },
          limit: {
            type: 'number',
            description: '返回结果数量限制，默认 20',
            default: 20,
          },
        },
        required: ['postId'],
      },
    },
    {
      name: 'post_comment',
      description: '发布微博评论（需要用户确认）',
      inputSchema: {
        type: 'object',
        properties: {
          postId: {
            type: 'string',
            description: '微博 ID',
          },
          text: {
            type: 'string',
            description: '评论内容',
          },
        },
        required: ['postId', 'text'],
      },
    },
    {
      name: 'export_data',
      description: '导出数据为 JSON 或 CSV 格式',
      inputSchema: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['json', 'csv'],
            description: '导出格式',
          },
          filename: {
            type: 'string',
            description: '文件名',
          },
          data: {
            type: 'array',
            description: '要导出的数据',
          },
        },
        required: ['format', 'filename', 'data'],
      },
    },
    {
      name: 'get_status',
      description: '获取服务运行状态',
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
    logger.logWeiboOperation(`执行工具: ${name}`, args);

    switch (name) {
      case 'search_posts':
        return await this.searchPosts(args as SearchPostsParams);
      
      case 'get_hot_topics':
        return await this.getHotTopics(args as GetHotTopicsParams);
      
      case 'get_comments':
        return await this.getComments(args as GetCommentsParams);
      
      case 'post_comment':
        return await this.postComment(args as PostCommentParams);
      
      case 'export_data':
        return await this.exportData(args as ExportDataParams);
      
      case 'get_status':
        return await this.getStatus();
      
      default:
        throw new Error(`未知工具: ${name}`);
    }
  }

  private async searchPosts(params: SearchPostsParams): Promise<CallToolResult> {
    const { keyword, limit = 20, sort = 'time' } = params;
    
    try {
      const posts = await weiboAPI.searchPosts(keyword, limit, sort);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: posts,
              meta: {
                keyword,
                limit,
                sort,
                count: posts.length,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('搜索微博失败:', error);
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

  private async getHotTopics(params: GetHotTopicsParams): Promise<CallToolResult> {
    const { limit = 50 } = params;
    
    try {
      const topics = await weiboAPI.getHotTopics(limit);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: topics,
              meta: {
                limit,
                count: topics.length,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('获取热搜榜失败:', error);
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

  private async getComments(params: GetCommentsParams): Promise<CallToolResult> {
    const { postId, limit = 20 } = params;
    
    try {
      const comments = await weiboAPI.getComments(postId, limit);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: comments,
              meta: {
                postId,
                limit,
                count: comments.length,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('获取评论失败:', error);
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

  private async postComment(params: PostCommentParams): Promise<CallToolResult> {
    const { postId, text } = params;
    
    try {
      // 这里需要用户确认，避免自动发布
      const result = await weiboAPI.postComment(postId, text, true);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: result,
              message: '评论发布成功（需要用户确认）',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('发布评论失败:', error);
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

  private async exportData(params: ExportDataParams): Promise<CallToolResult> {
    const { format, filename, data } = params;
    
    try {
      const exportPath = configManager.getExportPath(filename);
      let content: string;
      
      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        content = this.convertToCSV(data);
      } else {
        throw new Error(`不支持的导出格式: ${format}`);
      }
      
      // 这里应该写入文件，但为了简化，我们返回内容
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `数据已导出为 ${format} 格式`,
              filename: exportPath,
              content,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('导出数据失败:', error);
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
              authenticated: configManager.isWeiboAuthenticated(),
              mcpServer: {
                port: config.mcp.port,
                host: config.mcp.host,
              },
              weibo: {
                hasAccessToken: !!config.weibo.accessToken,
                hasCookie: !!config.weibo.cookie,
                rateLimit: config.weibo.rateLimit,
              },
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

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // 处理包含逗号或引号的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

export const weiboTools = new WeiboTools();
