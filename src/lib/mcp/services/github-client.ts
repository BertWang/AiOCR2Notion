// src/lib/mcp/services/github-client.ts
// GitHub API 服務客戶端

import { BaseMCPServiceClient } from './base-client';
import { MCPActionType } from '../types';

/**
 * GitHub API 客戶端
 */
export class GitHubClient extends BaseMCPServiceClient {
  private token: string = '';
  private baseUrl: string = 'https://api.github.com';

  constructor() {
    super('GitHub', 'github');
  }

  /**
   * 驗證配置
   */
  protected async validateConfig(): Promise<void> {
    if (!this.config.credentials) {
      throw new Error('GitHub token is required');
    }

    const credentials = this.getCredentials();
    if (!credentials.token) {
      throw new Error('GitHub token not found in credentials');
    }

    this.token = credentials.token;
  }

  /**
   * 建立連接
   */
  protected async establishConnection(): Promise<void> {
    await this.performHealthCheck();
  }

  /**
   * 關閉連接
   */
  protected async closeConnection(): Promise<void> {
    // HTTP 客戶端無需顯式關閉
  }

  /**
   * 執行健康檢查
   */
  protected async performHealthCheck(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`GitHub health check failed: ${error}`);
    }
  }

  /**
   * 執行操作
   */
  protected async executeAction(action: MCPActionType, input: any): Promise<any> {
    switch (action) {
      case 'query':
        return this.searchRepositories(input.query, input.options);

      case 'create':
        return this.createGist(input.content, input.options);

      case 'sync':
        return this.getRepositoryContent(input.owner, input.repo, input.path);

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  /**
   * 搜索倉庫
   */
  private async searchRepositories(query: string, options?: any): Promise<any> {
    const searchParams = new URLSearchParams({
      q: query,
      per_page: String(options?.perPage || 10),
      page: String(options?.page || 1),
    });

    const response = await fetch(`${this.baseUrl}/search/repositories?${searchParams}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 創建 Gist
   */
  private async createGist(content: any, options?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/gists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: options?.description || 'Created from TestMoltbot',
        public: options?.public ?? false,
        files: content,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Create Gist failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 獲取倉庫內容
   */
  private async getRepositoryContent(owner: string, repo: string, path: string = ''): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Get content failed: ${response.statusText}`);
    }

    return await response.json();
  }
}
