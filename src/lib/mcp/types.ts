// src/lib/mcp/types.ts
// MCP 集成核心型別定義

/**
 * MCP 服務類型列表
 */
export type MCPServiceType = 
  | 'openclaw'
  | 'brave_search'
  | 'github'
  | 'slack'
  | 'google_drive'
  | 'web_crawler'
  | 'sqlite'
  | 'filesystem';

/**
 * MCP 認證類型
 */
export type MCPAuthType = 'api_key' | 'oauth' | 'jwt' | 'basic' | 'token';

/**
 * MCP 操作狀態
 */
export type MCPOperationStatus = 'pending' | 'processing' | 'success' | 'failed' | 'timeout' | 'cancelled';

/**
 * MCP 操作類型
 */
export type MCPActionType = 'process' | 'extract' | 'sync' | 'notify' | 'query' | 'create' | 'update' | 'delete';

/**
 * MCP 服務配置
 */
export interface MCPServiceConfig {
  id: string;
  name: string;
  type: MCPServiceType;
  enabled: boolean;
  endpoint?: string;
  authType?: MCPAuthType;
  credentials?: string; // 加密存儲
  config?: Record<string, any>;
  retryPolicy?: string;
  rateLimitPerMinute?: number;
  timeoutMs?: number;
  priority?: number;
  isRequired?: boolean;
  description?: string;
  lastTestedAt?: Date;
  lastTestStatus?: 'success' | 'failed';
  lastTestError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * MCP 操作結果
 */
export interface MCPOperationResult {
  success: boolean;
  status: MCPOperationStatus;
  data?: any;
  error?: string;
  errorCode?: string;
  executionTimeMs: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * MCP 同步日誌
 */
export interface MCPSyncLog {
  id: string;
  noteId: string;
  serviceName: string;
  action: MCPActionType;
  status: MCPOperationStatus;
  input?: any;
  output?: any;
  error?: string;
  executionTimeMs?: number;
  retryCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * MCP 快取項
 */
export interface MCPCacheItem {
  id: string;
  serviceName: string;
  cacheKey: string;
  cachedData: any;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * MCP 服務客戶端接口
 */
export interface IMCPServiceClient {
  name: string;
  type: MCPServiceType;
  connected: boolean;
  
  connect(config: MCPServiceConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  test(): Promise<MCPOperationResult>;
  
  // 通用操作
  execute(action: MCPActionType, input: any): Promise<MCPOperationResult>;
}

/**
 * MCP 連接池配置
 */
export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  maxIdleTimeMs: number;
  acquireTimeoutMs: number;
}

/**
 * MCP 會話信息
 */
export interface MCPSession {
  id: string;
  serviceType: MCPServiceType;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

/**
 * MCP 錯誤類型
 */
export class MCPError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * MCP 速率限制配置
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burst: number;
}

/**
 * MCP 重試策略
 */
export interface RetryPolicy {
  type: 'exponential' | 'linear' | 'fibonacci';
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * MCP 服務健康狀態
 */
export interface MCPServiceHealth {
  name: string;
  type: MCPServiceType;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheckAt: Date;
  uptime: number; // 百分比
  avgResponseTimeMs: number;
  errorRate: number; // 百分比
  message?: string;
}

/**
 * MCP 性能指標
 */
export interface MCPPerformanceMetrics {
  serviceName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  errorRate: number;
  cacheHitRate: number;
}

/**
 * MCP 事件
 */
export type MCPEventType = 
  | 'service:connected'
  | 'service:disconnected'
  | 'service:error'
  | 'operation:started'
  | 'operation:completed'
  | 'operation:failed'
  | 'cache:hit'
  | 'cache:miss'
  | 'rate-limit:exceeded';

export interface MCPEvent {
  type: MCPEventType;
  serviceName: string;
  timestamp: Date;
  data?: any;
}

/**
 * MCP 全局配置
 */
export interface MCPGlobalConfig {
  enabled: boolean;
  timeoutMs: number;
  maxRetries: number;
  enableCache: boolean;
  cacheExpirationMinutes: number;
  enableMonitoring: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  connectionPoolConfig: ConnectionPoolConfig;
}

/**
 * 快速模板定義
 */
export interface MCPQuickTemplate {
  id: string;
  name: string;
  description: string;
  services: Array<{
    type: MCPServiceType;
    config: Partial<MCPServiceConfig>;
  }>;
}

/**
 * MCP 操作請求
 */
export interface MCPOperationRequest {
  noteId: string;
  serviceName: string;
  action: MCPActionType;
  input: any;
  options?: {
    skipCache?: boolean;
    timeout?: number;
    priority?: number;
  };
}

/**
 * MCP 操作響應
 */
export interface MCPOperationResponse {
  requestId: string;
  result: MCPOperationResult;
  syncLog: MCPSyncLog;
}
