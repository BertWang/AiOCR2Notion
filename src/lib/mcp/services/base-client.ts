// src/lib/mcp/services/base-client.ts
// MCP 服務客戶端基類

import { IMCPServiceClient, MCPServiceConfig, MCPOperationResult, MCPActionType } from '../types';
import { RetryExecutor, RETRY_POLICIES } from '../retry-policy';

/**
 * MCP 服務客戶端基類
 * 所有具體的服務客戶端都應繼承此類
 */
export abstract class BaseMCPServiceClient implements IMCPServiceClient {
  name: string;
  type: any;
  connected = false;
  protected config!: MCPServiceConfig;
  protected retryExecutor: RetryExecutor;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
    this.retryExecutor = new RetryExecutor(RETRY_POLICIES.moderate);
  }

  /**
   * 連接到服務
   */
  async connect(config: MCPServiceConfig): Promise<void> {
    this.config = config;

    try {
      await this.validateConfig();
      await this.establishConnection();
      this.connected = true;
      console.log(`[${this.name}] Connected successfully`);
    } catch (error) {
      this.connected = false;
      console.error(`[${this.name}] Connection failed:`, error);
      throw error;
    }
  }

  /**
   * 斷開連接
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.closeConnection();
      this.connected = false;
      console.log(`[${this.name}] Disconnected`);
    } catch (error) {
      console.error(`[${this.name}] Disconnection error:`, error);
    }
  }

  /**
   * 測試連接
   */
  async test(): Promise<MCPOperationResult> {
    if (!this.connected) {
      return {
        success: false,
        status: 'failed',
        error: 'Not connected',
        executionTimeMs: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const startTime = Date.now();

    try {
      await this.performHealthCheck();

      return {
        success: true,
        status: 'success',
        data: { message: 'Health check passed' },
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 執行操作
   */
  async execute(action: MCPActionType, input: any): Promise<MCPOperationResult> {
    if (!this.connected) {
      return {
        success: false,
        status: 'failed',
        error: 'Not connected',
        executionTimeMs: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const startTime = Date.now();

    try {
      const result = await this.retryExecutor.execute(() =>
        this.executeAction(action, input)
      );

      return {
        success: true,
        status: 'success',
        data: result,
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 驗證配置（子類實現）
   */
  protected abstract validateConfig(): Promise<void>;

  /**
   * 建立連接（子類實現）
   */
  protected abstract establishConnection(): Promise<void>;

  /**
   * 關閉連接（子類實現）
   */
  protected abstract closeConnection(): Promise<void>;

  /**
   * 執行健康檢查（子類實現）
   */
  protected abstract performHealthCheck(): Promise<void>;

  /**
   * 執行具體操作（子類實現）
   */
  protected abstract executeAction(action: MCPActionType, input: any): Promise<any>;

  /**
   * 檢查連接狀態
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 獲取配置
   */
  getConfig(): MCPServiceConfig {
    return this.config;
  }

  /**
   * 解密憑證
   */
  protected getCredentials(): Record<string, any> {
    if (!this.config.credentials) {
      return {};
    }

    try {
      // 實際應該使用加密/解密
      return JSON.parse(this.config.credentials);
    } catch {
      return {};
    }
  }

  /**
   * 設置憑證
   */
  protected setCredentials(credentials: Record<string, any>): void {
    this.config.credentials = JSON.stringify(credentials);
  }
}
