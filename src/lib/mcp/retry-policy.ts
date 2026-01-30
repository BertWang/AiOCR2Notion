// src/lib/mcp/retry-policy.ts
// MCP 重試策略

import { RetryPolicy } from './types';

/**
 * 計算重試延遲
 */
function calculateDelay(
  policy: RetryPolicy,
  attemptNumber: number
): number {
  const { type, initialDelayMs, maxDelayMs, backoffMultiplier } = policy;

  let delay: number;

  switch (type) {
    case 'exponential':
      delay = initialDelayMs * Math.pow(backoffMultiplier, attemptNumber - 1);
      break;

    case 'linear':
      delay = initialDelayMs * attemptNumber;
      break;

    case 'fibonacci': {
      const fib = getFibonacci(attemptNumber);
      delay = initialDelayMs * fib;
      break;
    }

    default:
      delay = initialDelayMs;
  }

  return Math.min(Math.max(delay, initialDelayMs), maxDelayMs);
}

/**
 * 獲取斐波那契數
 */
function getFibonacci(n: number): number {
  if (n <= 1) return 1;
  if (n === 2) return 1;

  let a = 1,
    b = 1;
  for (let i = 3; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

/**
 * MCP 重試執行器
 */
export class RetryExecutor {
  constructor(private policy: RetryPolicy) {}

  /**
   * 執行帶重試的操作
   */
  async execute<T>(
    fn: () => Promise<T>,
    isRetryable?: (error: any) => boolean
  ): Promise<T> {
    let lastError: Error | null = null;
    let lastAttempt = 0;

    for (let attempt = 1; attempt <= this.policy.maxRetries + 1; attempt++) {
      try {
        lastAttempt = attempt;
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // 檢查是否應該重試
        if (attempt > this.policy.maxRetries) {
          break;
        }

        // 檢查自定義重試條件
        if (isRetryable && !isRetryable(error)) {
          throw error;
        }

        // 計算延遲
        const delay = calculateDelay(this.policy, attempt);

        console.debug(
          `[RetryExecutor] Attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`
        );

        // 等待
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(
      `Operation failed after ${lastAttempt} attempts: ${lastError?.message}`
    );
  }

  /**
   * 獲取預計重試時間
   */
  getEstimatedRetryTime(): number {
    let totalTime = 0;

    for (let i = 1; i <= this.policy.maxRetries; i++) {
      totalTime += calculateDelay(this.policy, i);
    }

    return totalTime;
  }
}

/**
 * 預定義的重試策略
 */
export const RETRY_POLICIES = {
  aggressive: {
    type: 'exponential' as const,
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 1000,
    backoffMultiplier: 2,
  },

  moderate: {
    type: 'exponential' as const,
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  },

  gentle: {
    type: 'linear' as const,
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 1,
  },

  slow: {
    type: 'exponential' as const,
    maxRetries: 7,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 1.5,
  },
};

/**
 * 可重試的錯誤檢查
 */
export function isRetryableError(error: any): boolean {
  // 網絡錯誤
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
    return true;
  }

  // 超時
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return true;
  }

  // HTTP 5xx 或 429 (太多請求)
  if (
    error.statusCode &&
    (error.statusCode >= 500 || error.statusCode === 429)
  ) {
    return true;
  }

  // DNS 錯誤
  if (error.code === 'ENOTFOUND') {
    return true;
  }

  return false;
}

/**
 * 獲取最適合的重試策略
 */
export function getOptimalRetryPolicy(
  operationType: string,
  errorType?: string
): RetryPolicy {
  // 根據操作類型選擇策略
  if (operationType.includes('search') || operationType.includes('query')) {
    return RETRY_POLICIES.moderate;
  }

  if (operationType.includes('sync') || operationType.includes('process')) {
    return RETRY_POLICIES.slow;
  }

  if (operationType.includes('notify') || operationType.includes('delete')) {
    return RETRY_POLICIES.gentle;
  }

  // 默認使用中等策略
  return RETRY_POLICIES.moderate;
}
