// src/lib/mcp/services/slack-client.ts
// Slack API 服務客戶端

import { BaseMCPServiceClient } from './base-client';
import { MCPActionType } from '../types';

/**
 * Slack API 客戶端
 */
export class SlackClient extends BaseMCPServiceClient {
  private botToken: string = '';
  private baseUrl: string = 'https://slack.com/api';

  constructor() {
    super('Slack', 'slack');
  }

  /**
   * 驗證配置
   */
  protected async validateConfig(): Promise<void> {
    if (!this.config.credentials) {
      throw new Error('Slack bot token is required');
    }

    const credentials = this.getCredentials();
    if (!credentials.botToken) {
      throw new Error('Slack bot token not found in credentials');
    }

    this.botToken = credentials.botToken;
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
      const response = await fetch(`${this.baseUrl}/auth.test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack auth failed: ${data.error}`);
      }
    } catch (error) {
      throw new Error(`Slack health check failed: ${error}`);
    }
  }

  /**
   * 執行操作
   */
  protected async executeAction(action: MCPActionType, input: any): Promise<any> {
    switch (action) {
      case 'notify':
        return this.postMessage(input.channel, input.text, input.options);

      case 'query':
        return this.searchMessages(input.query, input.options);

      case 'create':
        return this.createChannel(input.name, input.options);

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  /**
   * 發送消息
   */
  private async postMessage(channel: string, text: string, options?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text,
        blocks: options?.blocks,
        thread_ts: options?.threadTs,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Post message failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  /**
   * 搜索消息
   */
  private async searchMessages(query: string, options?: any): Promise<any> {
    const searchParams = new URLSearchParams({
      query,
      count: String(options?.count || 20),
      sort: options?.sort || 'timestamp',
    });

    const response = await fetch(`${this.baseUrl}/search.messages?${searchParams}`, {
      headers: {
        Authorization: `Bearer ${this.botToken}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  /**
   * 創建頻道
   */
  private async createChannel(name: string, options?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/conversations.create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        is_private: options?.isPrivate ?? false,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Create channel failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }
}
