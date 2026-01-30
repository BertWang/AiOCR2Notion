// src/lib/mcp/service-manager.ts
// MCP 服務管理器 - 核心協調引擎

import { EventEmitter } from 'events';
import { 
  MCPServiceConfig, 
  MCPOperationResult, 
  MCPOperationStatus,
  MCPServiceType,
  MCPError,
  MCPEvent,
  MCPEventType,
  MCPServiceHealth,
  MCPPerformanceMetrics,
  MCPGlobalConfig
} from './types';
import { ConnectionPool } from './connection-pool';
import { SessionManager } from './session-manager';
import { RetryExecutor, RETRY_POLICIES } from './retry-policy';
import { RateLimiter, RateLimitError } from './rate-limiter';

// 導入所有服務客戶端
import { BraveSearchClient } from './services/brave-search-client';
import { GiBaseMCPServiceClientbClient } from './services/github-client';
import { SlackClient } from './services/slack-client';
import { FilesystemClient } from './services/filesystem-client';
import { SQLiteClient } from './services/sqlite-client';
import { WebCrawlerClient } from './services/webcrawler-client';
import { OpenClawClient } from './services/openclaw-client';
import { GoogleDriveClient } from './services/google-drive-client';
import { BaseMCPServiceClient } from './services/base-client';

interface ServiceInstance {
  config: MCPServiceConfig;
  client?: any;
  connected: boolean;
  lastHealthCheck: Date;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalExecutionTimeMs: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

/**
 * MCP 服務管理器 - 核心系統
 * 負責：
 * - 服務生命週期管理
 * - 連接池和會話管理
 * - 速率限制和重試
 * - 性能監控和健康檢查
 * - 事件發送和日誌記錄
 */
export class MCPServiceManager extends EventEmitter {
  private services: Map<string, ServiceInstance> = new Map();
  private connectionPool: ConnectionPool;
  private sessionManager: SessionManager;
  private rateLimiter: RateLimiter;
  private globalConfig: MCPGlobalConfig;
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(globalConfig: Partial<MCPGlobalConfig> = {}) {
    super();

    this.globalConfig = {
      enabled: true,
      timeoutMs: 30000,
      maxRetries: 3,
      enableCache: true,
      cacheExpirationMinutes: 15,
      enableMonitoring: true,
      logLevel: 'info',
      connectionPoolConfig: {
        maxConnections: 10,
        minConnections: 2,
        maxIdleTimeMs: 5 * 60 * 1000,
        acquireTimeoutMs: 30 * 1000,
      },
      ...globalConfig,
    };

    this.connectionPool = new ConnectionPool(
      this.globalConfig.connectionPoolConfig
    );
    this.sessionManager = new SessionManager({
      sessionTimeoutMinutes: 30,
      maxSessionsPerService: 100,
    });
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      burst: 10,
    });
  }

  /**
   * 初始化服務管理器
   */
  async initialize(services: MCPServiceConfig[]): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.log('info', `Initializing MCP Service Manager with ${services.length} services`);

    for (const config of services) {
      await this.registerService(config);
    }

    this.startHealthCheckInterval();
    this.isInitialized = true;

    this.emit('initialized', { serviceCount: services.length });
  }

  /**
   * 註冊服務
   */
  async registerService(config: MCPServiceConfig): Promise<void> {
    if (!config.id || !config.type) {
      throw new MCPError('INVALID_CONFIG', 'Service config must have id and type');
    }

    // 創建對應的服務客戶端
    const client = this.createServiceClient(config.type);

    const instance: ServiceInstance = {
      config,
      client,
      connected: false,
      lastHealthCheck: new Date(0),
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalExecutionTimeMs: 0,
        cacheHits: 0,
        cacheMisses: 0,
      },
    };

    this.services.set(config.id, instance);
    this.log('debug', `Service registered: ${config.id} (${config.type})`);
  }

  /**
   * 創建服務客戶端
   */
  private createServiceClient(type: MCPServiceType): BaseMCPServiceClient {
    switch (type) {
      case 'openclaw':
        return new OpenClawClient();
      case 'brave_search':
        return new BraveSearchClient();
      case 'github':
        return new GitHubClient();
      case 'slack':
        return new SlackClient();
      case 'google_drive':
        return new GoogleDriveClient();
      case 'web_crawler':
        return new WebCrawlerClient();
      case 'sqlite':
        return new SQLiteClient();
      case 'filesystem':
        return new FilesystemClient();
      default:
        throw new MCPError('UNKNOWN_SERVICE_TYPE', `Unknown service type: ${type}`);
    }
  }

  /**
   * 獲取服務
   */
  getService(serviceId: string): MCPServiceConfig | null {
    const instance = this.services.get(serviceId);
    return instance?.config || null;
  }

  /**
   * 更新服務配置
   */
  async updateService(serviceId: string, updates: Partial<MCPServiceConfig>): Promise<void> {
    const instance = this.services.get(serviceId);
    if (!instance) {
      throw new MCPError('SERVICE_NOT_FOUND', `Service ${serviceId} not found`);
    }

    instance.config = { ...instance.config, ...updates };

    if (instance.connected) {
      // 使用實際的客戶端連接
      if (instance.client) {
        await instance.client.connect(instance.config);
      }
disconnect(serviceId);
      await this.connect(serviceId);
    }

    this.log('debug', `Service updated: ${serviceId}`);
  }

  /**
   * 刪除服務
   */
  async removeService(serviceId: string): Promise<void> {
    const instance = this.services.get(serviceId);
    if (!instance) {
      throw new MCPError('SERVICE_NOT_FOUND', `Service ${serviceId} not found`);
    }

    if (instance.connected) {
      await this.disconnect(serviceId);
    }

    this.services.delete(serviceId);
    this.log('debug', `Service removed: ${serviceId}`);
  }

  /**
   * 連接服務
   */
  async connect(serviceId: string): Promise<void> {
    const instance = this.services.get(serviceId);
    if (!instance) {
      throw new MCPError('SERVICE_NOT_FOUND', `Service ${serviceId} not found`);
    }

    if (instance.connected) {
      return; // 已連接
    }

    try {
      this.log('debug', `Connecting to service: ${serviceId}`);

      // 這裡應該連接到實際的服務客戶端
      // 暫時使用模擬連接
      instance.connected = true;
      instance.lastHealthCheck = new Date();

      this.emit('service:connected', {
        type: 'service:connected',
        serviceName: serviceId,
        timestamp: new Date(),
      });

      this.log('debug', `Connected to service: ${serviceId}`);
    } catch (error) {
      this.log('error', `Failed to connect to service ${serviceId}: ${error}`);
      throw error;
    }
  }

  /**
   * 斷開服務連接
   */
  async disconnect(serviceId: string): Promise<void> {
    const instance = this.services.get(serviceId);
    if (!instance) {
      return;
    }

    if (!instance.connected) {
      return; // 已斷開
    }

    try {
      this.log('debug', `Disconnecting from service: ${serviceId}`);

      // 使用實際的客戶端斷開連接
      if (instance.client) {
        await instance.client.disconnect();
      }

      // 清理會話和連接
      this.sessionManager.destroyServiceSessions(instance.config.type);
      await this.connectionPool.purge(serviceId);

      instance.connected = false;

      this.emit('service:disconnected', {
        type: 'service:disconnected',
        serviceName: serviceId,
        timestamp: new Date(),
      });

      this.log('debug', `Disconnected from service: ${serviceId}`);
    } catch (error) {
      this.log('error', `Error disconnecting from service ${serviceId}: ${error}`);
    }
  }

  /**
   * 執行操作
   */
  async executeOperation(
    serviceId: string,
    action: string,
    input: any,
    options?: { timeout?: number; skipCache?: boolean }
  ): Promise<MCPOperationResult> {
    const startTime = Date.now();
    const instance = this.services.get(serviceId);

    if (!instance) {
      return {
        success: false,
        status: 'failed',
        error: `Service ${serviceId} not found`,
        errorCode: 'SERVICE_NOT_FOUND',
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // 檢查速率限制
    try {
      const allowed = await this.rateLimiter.checkLimit(serviceId);
      if (!allowed) {
        return {
          success: false,
          status: 'timeout',
          error: 'Rate limit exceeded',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          executionTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.log('error', `Rate limit check failed: ${error}`);
    }

    try {
      // 更新指標
      instance.metrics.totalRequests++;

      // 執行操作（帶重試）
      const policy = RETRY_POLICIES.moderate;
      const executor = new RetryExecutor(policy);
      const timeout = options?.timeout || this.globalConfig.timeoutMs;

      const result = await Promise.race([
        executor.execute(() => this.performOperation(instance, action, input)),
        new Promise<MCPOperationResult>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        ),
      ]);

      instance.metrics.successfulRequests++;
      instance.metrics.totalExecutionTimeMs += Date.now() - startTime;

      this.emit('operation:completed', {
        type: 'operation:completed',
        serviceName: serviceId,
        timestamp: new Date(),
        data: { action, executionTimeMs: Date.now() - startTime },
      });

      return {
        ...result,
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      instance.metrics.failedRequests++;

      this.emit('operation:failed', {
        type: 'operation:failed',
        serviceName: serviceId,
        timestamp: new Date(),
        data: { action, error: String(error) },
      });

      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        status: 'failed',
        error: errorMessage,
        errorCode: 'OPERATION_FAILED',
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 執行實際操作（由子類或外部驅動）
   */
  private async performOperation(
    instance: ServiceInstance,
    action: string,
    input: any
  ): Promise<MCPOperationResult> {
    if (!instance.client) {
      throw new MCPError('NO_CLIENT', 'Service client not initialized');
    }

    if (!instance.connected) {
      await this.connect(instance.config.id);
    }

    // 使用實際的客戶端執行操作
    const result = await instance.client.execute(action as any, input);

    return {
      success: true,
      status: 'success',
      data: { action, input, executedAt: new Date().toISOString() },
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 健康檢查
   */
  async checkHealth(serviceId?: string): Promise<MCPServiceHealth | MCPServiceHealth[]> {
    const servicesToCheck = serviceId
      ? [this.services.get(serviceId)!]
      : Array.from(this.services.values());

    const healthStatuses: MCPServiceHealth[] = [];

    for (const instance of servicesToCheck) {
      if (!instance) continue;

      const now = new Date();
      const metrics = instance.metrics;
      const errorRate =
        metrics.totalRequests > 0
          ? (metrics.failedRequests / metrics.totalRequests) * 100
          : 0;
      const avgResponseTime =
        metrics.successfulRequests > 0
          ? metrics.totalExecutionTimeMs / metrics.successfulRequests
          : 0;

      let status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' = 'healthy';
      let message = 'Service is operational';

      if (!instance.connected) {
        status = 'unhealthy';
        message = 'Service is not connected';
      } else if (errorRate > 10) {
        status = 'degraded';
        message = `High error rate: ${errorRate.toFixed(2)}%`;
      }

      const uptime =
        instance.config.lastTestedAt && instance.config.lastTestStatus === 'success'
          ? 100
          : 0;

      healthStatuses.push({
        name: instance.config.name,
        type: instance.config.type,
        status,
        lastCheckAt: now,
        uptime,
        avgResponseTimeMs: avgResponseTime,
        errorRate,
        message,
      });
    }

    return serviceId ? healthStatuses[0] : healthStatuses;
  }

  /**
   * 獲取性能指標
   */
  getPerformanceMetrics(serviceId: string): MCPPerformanceMetrics | null {
    const instance = this.services.get(serviceId);
    if (!instance) {
      return null;
    }

    const metrics = instance.metrics;
    const successfulRequests = Math.max(metrics.successfulRequests, 1);

    return {
      serviceName: instance.config.name,
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      averageResponseTimeMs: metrics.totalExecutionTimeMs / successfulRequests,
      p95ResponseTimeMs: 0, // 需要更詳細的跟蹤
      p99ResponseTimeMs: 0, // 需要更詳細的跟蹤
      errorRate:
        metrics.totalRequests > 0
          ? (metrics.failedRequests / metrics.totalRequests) * 100
          : 0,
      cacheHitRate:
        metrics.cacheHits + metrics.cacheMisses > 0
          ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
          : 0,
    };
  }

  /**
   * 獲取所有服務
   */
  getAllServices(): MCPServiceConfig[] {
    return Array.from(this.services.values()).map((i) => i.config);
  }

  /**
   * 獲取服務計數
   */
  getServiceCount(): number {
    return this.services.size;
  }

  /**
   * 獲取連接狀態
   */
  getConnectionStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    for (const [serviceId, instance] of this.services.entries()) {
      status[serviceId] = {
        name: instance.config.name,
        connected: instance.connected,
        lastHealthCheck: instance.lastHealthCheck,
      };
    }

    return status;
  }

  /**
   * 啟動定期健康檢查
   */
  private startHealthCheckInterval(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        this.log('error', `Health check failed: ${error}`);
      }
    }, 5 * 60 * 1000); // 每5分鐘檢查一次
  }

  /**
   * 清理資源
   */
  async destroy(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // 斷開所有服務
    for (const [serviceId] of this.services.entries()) {
      try {
        await this.disconnect(serviceId);
      } catch (error) {
        this.log('error', `Error disconnecting ${serviceId}: ${error}`);
      }
    }

    // 清理池和會話
    await this.connectionPool.drain();
    this.sessionManager.clear();
    this.rateLimiter.reset();

    this.services.clear();
    this.isInitialized = false;

    this.log('info', 'MCP Service Manager destroyed');
  }

  /**
   * 日誌記錄
   */
  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [MCPServiceManager] ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
        if (this.globalConfig.logLevel === 'debug') {
          console.debug(logMessage);
        }
        break;
      case 'info':
      default:
        console.log(logMessage);
        break;
    }
  }

  /**
   * 獲取系統狀態
   */
  getSystemStatus(): Record<string, any> {
    const connectedServices = Array.from(this.services.values()).filter(
      (s) => s.connected
    ).length;

    return {
      isInitialized: this.isInitialized,
      totalServices: this.services.size,
      connectedServices,
      poolStatus: this.connectionPool.getStatus(),
      sessionStats: this.sessionManager.getStats(),
      rateLimiterEnabled: !!this.rateLimiter,
    };
  }
}

/**
 * 全局 MCP 服務管理器實例
 */
let globalServiceManager: MCPServiceManager | null = null;

/**
 * 獲取全局服務管理器實例
 */
export function getServiceManager(
  config?: Partial<MCPGlobalConfig>
): MCPServiceManager {
  if (!globalServiceManager) {
    globalServiceManager = new MCPServiceManager(config);
  }

  return globalServiceManager;
}

/**
 * 初始化全局服務管理器
 */
export async function initializeServiceManager(
  services: MCPServiceConfig[],
  config?: Partial<MCPGlobalConfig>
): Promise<MCPServiceManager> {
  const manager = getServiceManager(config);
  await manager.initialize(services);
  return manager;
}
