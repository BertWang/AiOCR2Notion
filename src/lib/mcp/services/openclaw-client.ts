// src/lib/mcp/services/openclaw-client.ts
// OpenClaw 分析服務客戶端

import { BaseMCPServiceClient } from './base-client';
import { MCPActionType } from '../types';

/**
 * OpenClaw 客戶端
 * 用於筆記分析、標記生成和內容理解
 */
export class OpenClawClient extends BaseMCPServiceClient {
  private apiKey: string = '';
  private baseUrl: string = '';

  constructor() {
    super('OpenClaw', 'openclaw');
  }

  /**
   * 驗證配置
   */
  protected async validateConfig(): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error('OpenClaw endpoint is required');
    }

    if (!this.config.credentials) {
      throw new Error('OpenClaw API key is required');
    }

    const credentials = this.getCredentials();
    if (!credentials.apiKey) {
      throw new Error('API key not found in credentials');
    }

    this.baseUrl = this.config.endpoint;
    this.apiKey = credentials.apiKey;
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
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`OpenClaw health check failed: ${error}`);
    }
  }

  /**
   * 執行操作
   */
  protected async executeAction(action: MCPActionType, input: any): Promise<any> {
    switch (action) {
      case 'process':
        return this.analyzeNote(input.content, input.options);

      case 'extract':
        return this.extractEntities(input.content, input.options);

      case 'create':
        return this.generateTags(input.content, input.options);

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  /**
   * 分析筆記
   */
  private async analyzeNote(content: string, options?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        language: options?.language || 'zh-TW',
        depth: options?.depth || 'standard',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 提取實體
   */
  private async extractEntities(content: string, options?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/entities`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        types: options?.types || ['person', 'organization', 'location', 'date'],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`Entity extraction failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 生成標籤
   */
  private async generateTags(content: string, options?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tags`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        maxTags: options?.maxTags || 5,
        minConfidence: options?.minConfidence || 0.5,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Tag generation failed: ${response.statusText}`);
    }

    return await response.json();
  }
}
