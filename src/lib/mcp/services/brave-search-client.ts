// src/lib/mcp/services/brave-search-client.ts
// Brave Search 服務客戶端

import { BaseMCPServiceClient } from './base-client';
import { MCPActionType } from '../types';

/**
 * Brave Search API 客戶端
 */
export class BraveSearchClient extends BaseMCPServiceClient {
  private apiKey: string = '';
  private baseUrl: string = 'https://api.search.brave.com/res/v1';

  constructor() {
    super('Brave Search', 'brave_search');
  }

  /**
   * 驗證配置
   */
  protected async validateConfig(): Promise<void> {
    if (!this.config.credentials) {
      throw new Error('API key is required for Brave Search');
    }

    const credentials = this.getCredentials();
    if (!credentials.apiKey) {
      throw new Error('API key not found in credentials');
    }

    this.apiKey = credentials.apiKey;
  }

  /**
   * 建立連接
   */
  protected async establishConnection(): Promise<void> {
    // Brave Search 使用無狀態 HTTP API，所以連接只是驗證
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
      const response = await fetch(`${this.baseUrl}/web`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': this.apiKey,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Brave Search health check failed: ${error}`);
    }
  }

  /**
   * 執行操作
   */
  protected async executeAction(action: MCPActionType, input: any): Promise<any> {
    switch (action) {
      case 'query':
        return this.search(input.query, input.options);

      case 'process':
        return this.processSearchResults(input);

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  /**
   * 搜索
   */
  private async search(query: string, options?: any): Promise<any> {
    const searchParams = new URLSearchParams({
      q: query,
      count: String(options?.count || 10),
    });

    if (options?.offset) {
      searchParams.append('offset', String(options.offset));
    }

    const response = await fetch(`${this.baseUrl}/web?${searchParams}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': this.apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 處理搜索結果
   */
  private processSearchResults(results: any): any {
    if (!results || !results.web) {
      return { processed: [], count: 0 };
    }

    return {
      processed: results.web.map((item: any) => ({
        title: item.title,
        description: item.description,
        url: item.url,
        language: item.language || 'en',
      })),
      count: results.web.length,
    };
  }
}
