// src/lib/mcp/rate-limiter.ts
// MCP 速率限制

import { RateLimitConfig } from './types';

interface RateLimitBucket {
  tokens: number;
  lastRefillAt: number;
  requestCount: number;
  requestsAtTime: number[];
}

/**
 * 令牌桶算法實現
 */
export class TokenBucket {
  private buckets: Map<string, RateLimitBucket> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * 嘗試獲取許可
   */
  tryAcquire(key: string, tokensRequired: number = 1): boolean {
    const bucket = this.getBucket(key);
    this.refill(key);

    if (bucket.tokens >= tokensRequired) {
      bucket.tokens -= tokensRequired;
      bucket.requestCount++;
      return true;
    }

    return false;
  }

  /**
   * 獲取許可（阻塞直到可用）
   */
  async acquire(
    key: string,
    tokensRequired: number = 1,
    timeoutMs: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (true) {
      if (this.tryAcquire(key, tokensRequired)) {
        return true;
      }

      if (Date.now() - startTime > timeoutMs) {
        return false;
      }

      // 等待一段時間後重試
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * 補充令牌
   */
  private refill(key: string): void {
    const bucket = this.getBucket(key);
    const now = Date.now();
    const elapsed = (now - bucket.lastRefillAt) / 1000; // 轉換為秒

    // 每秒補充令牌
    const tokensToAdd =
      (this.config.requestsPerMinute / 60) * elapsed +
      (this.config.requestsPerHour / (60 * 60)) * elapsed;

    bucket.tokens = Math.min(
      bucket.tokens + tokensToAdd,
      this.config.requestsPerMinute
    );
    bucket.lastRefillAt = now;
  }

  /**
   * 獲取或創建桶
   */
  private getBucket(key: string): RateLimitBucket {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        tokens: this.config.requestsPerMinute,
        lastRefillAt: Date.now(),
        requestCount: 0,
        requestsAtTime: [],
      });
    }

    return this.buckets.get(key)!;
  }

  /**
   * 重置桶
   */
  reset(key?: string): void {
    if (key) {
      this.buckets.delete(key);
    } else {
      this.buckets.clear();
    }
  }

  /**
   * 獲取統計信息
   */
  getStats(key: string): { requestCount: number; tokensAvailable: number } {
    const bucket = this.getBucket(key);
    this.refill(key);

    return {
      requestCount: bucket.requestCount,
      tokensAvailable: bucket.tokens,
    };
  }
}

/**
 * 滑動窗口算法實現
 */
export class SlidingWindow {
  private windows: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * 嘗試獲取許可
   */
  tryAcquire(key: string): boolean {
    const window = this.getWindow(key);
    const now = Date.now();
    const windowStart = now - 60 * 1000; // 1分鐘窗口

    // 移除過期的時間戳
    const filteredWindow = window.filter((timestamp) => timestamp > windowStart);
    this.windows.set(key, filteredWindow);

    // 檢查是否超過限制
    if (filteredWindow.length >= this.config.requestsPerMinute) {
      return false;
    }

    // 添加當前請求
    filteredWindow.push(now);
    return true;
  }

  /**
   * 獲取窗口
   */
  private getWindow(key: string): number[] {
    if (!this.windows.has(key)) {
      this.windows.set(key, []);
    }

    return this.windows.get(key)!;
  }

  /**
   * 重置窗口
   */
  reset(key?: string): void {
    if (key) {
      this.windows.delete(key);
    } else {
      this.windows.clear();
    }
  }

  /**
   * 獲取統計信息
   */
  getStats(key: string): { requestCount: number; windowSize: number } {
    const window = this.getWindow(key);
    const now = Date.now();
    const windowStart = now - 60 * 1000;

    const filteredWindow = window.filter((timestamp) => timestamp > windowStart);
    this.windows.set(key, filteredWindow);

    return {
      requestCount: filteredWindow.length,
      windowSize: this.config.requestsPerMinute,
    };
  }
}

/**
 * MCP 速率限制器 - 使用令牌桶算法
 */
export class RateLimiter {
  private tokenBucket: TokenBucket;
  private slidingWindow: SlidingWindow;
  private algorithm: 'token-bucket' | 'sliding-window';

  constructor(
    config: RateLimitConfig,
    algorithm: 'token-bucket' | 'sliding-window' = 'token-bucket'
  ) {
    this.tokenBucket = new TokenBucket(config);
    this.slidingWindow = new SlidingWindow(config);
    this.algorithm = algorithm;
  }

  /**
   * 檢查是否允許請求
   */
  async checkLimit(key: string, timeoutMs?: number): Promise<boolean> {
    if (this.algorithm === 'token-bucket') {
      return await this.tokenBucket.acquire(key, 1, timeoutMs);
    } else {
      return this.slidingWindow.tryAcquire(key);
    }
  }

  /**
   * 立即檢查（非阻塞）
   */
  checkLimitSync(key: string): boolean {
    if (this.algorithm === 'token-bucket') {
      return this.tokenBucket.tryAcquire(key);
    } else {
      return this.slidingWindow.tryAcquire(key);
    }
  }

  /**
   * 獲取統計信息
   */
  getStats(key: string): any {
    if (this.algorithm === 'token-bucket') {
      return this.tokenBucket.getStats(key);
    } else {
      return this.slidingWindow.getStats(key);
    }
  }

  /**
   * 重置限制
   */
  reset(key?: string): void {
    this.tokenBucket.reset(key);
    this.slidingWindow.reset(key);
  }
}

/**
 * 組合速率限制器 - 同時應用多個限制
 */
export class CompositeRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();

  /**
   * 添加限制器
   */
  addLimiter(name: string, config: RateLimitConfig): void {
    this.limiters.set(name, new RateLimiter(config));
  }

  /**
   * 檢查所有限制
   */
  async checkAllLimits(key: string): Promise<boolean> {
    for (const limiter of this.limiters.values()) {
      const allowed = await limiter.checkLimit(key);
      if (!allowed) {
        return false;
      }
    }

    return true;
  }

  /**
   * 檢查單個限制
   */
  async checkLimit(name: string, key: string): Promise<boolean> {
    const limiter = this.limiters.get(name);
    if (!limiter) {
      throw new Error(`Limiter ${name} not found`);
    }

    return await limiter.checkLimit(key);
  }

  /**
   * 獲取所有統計信息
   */
  getAllStats(key: string): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, limiter] of this.limiters.entries()) {
      stats[name] = limiter.getStats(key);
    }

    return stats;
  }

  /**
   * 重置所有限制
   */
  resetAll(key?: string): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset(key);
    }
  }
}

/**
 * 速率限制錯誤
 */
export class RateLimitError extends Error {
  constructor(
    public key: string,
    public retryAfterMs: number,
    public stats: any
  ) {
    super(`Rate limit exceeded for ${key}. Retry after ${retryAfterMs}ms`);
    this.name = 'RateLimitError';
  }
}
