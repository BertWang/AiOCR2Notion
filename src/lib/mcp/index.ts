// src/lib/mcp/index.ts
// MCP 核心模組導出

export * from './types';
export * from './session-manager';
export * from './retry-policy';
export * from './rate-limiter';
export * from './service-manager';

// 連接池 - 選擇性導出避免與 types 衝突
export { ConnectionPool } from './connection-pool';
export type { ConnectionPoolConfig } from './connection-pool';

// 便利導出
export {
  getServiceManager,
  initializeServiceManager,
  MCPServiceManager,
} from './service-manager';

export {
  RETRY_POLICIES,
  RetryExecutor,
  isRetryableError,
  getOptimalRetryPolicy,
} from './retry-policy';

export {
  RateLimiter,
  TokenBucket,
  SlidingWindow,
  CompositeRateLimiter,
  RateLimitError,
} from './rate-limiter';

export {
  SessionManager,
} from './session-manager';
