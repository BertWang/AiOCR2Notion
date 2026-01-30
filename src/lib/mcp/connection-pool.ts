// src/lib/mcp/connection-pool.ts
// MCP 連接池管理

import { EventEmitter } from 'events';

interface PooledConnection {
  id: string;
  client: any;
  createdAt: Date;
  lastUsedAt: Date;
  inUse: boolean;
}

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  maxIdleTimeMs: number;
  acquireTimeoutMs: number;
}

const DEFAULT_CONFIG: ConnectionPoolConfig = {
  maxConnections: 10,
  minConnections: 2,
  maxIdleTimeMs: 5 * 60 * 1000, // 5分鐘
  acquireTimeoutMs: 30 * 1000,  // 30秒
};

/**
 * MCP 連接池 - 管理可重用的服務連接
 */
export class ConnectionPool extends EventEmitter {
  private connections: Map<string, PooledConnection[]> = new Map();
  private pendingRequests: Map<string, ((conn: any) => void)[]> = new Map();
  private config: ConnectionPoolConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  /**
   * 獲取連接
   */
  async acquire(serviceKey: string, creator: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection pool timeout for ${serviceKey}`));
      }, this.config.acquireTimeoutMs);

      try {
        // 嘗試從池中獲取可用連接
        const available = this.getAvailableConnection(serviceKey);
        if (available) {
          clearTimeout(timeout);
          available.inUse = true;
          available.lastUsedAt = new Date();
          resolve(available.client);
          return;
        }

        // 如果未超過上限，創建新連接
        const connections = this.connections.get(serviceKey) || [];
        if (connections.length < this.config.maxConnections) {
          creator()
            .then((client) => {
              clearTimeout(timeout);
              const pooled: PooledConnection = {
                id: `${serviceKey}-${Date.now()}-${Math.random()}`,
                client,
                createdAt: new Date(),
                lastUsedAt: new Date(),
                inUse: true,
              };
              connections.push(pooled);
              this.connections.set(serviceKey, connections);
              resolve(client);
            })
            .catch((error) => {
              clearTimeout(timeout);
              reject(error);
            });
          return;
        }

        // 等待可用連接
        const pending = this.pendingRequests.get(serviceKey) || [];
        pending.push((client) => {
          clearTimeout(timeout);
          resolve(client);
        });
        this.pendingRequests.set(serviceKey, pending);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * 歸還連接
   */
  release(serviceKey: string, client: any): void {
    const connections = this.connections.get(serviceKey) || [];
    const conn = connections.find((c) => c.client === client);

    if (!conn) {
      return;
    }

    conn.inUse = false;
    conn.lastUsedAt = new Date();

    // 檢查是否有等待的請求
    const pending = this.pendingRequests.get(serviceKey);
    if (pending && pending.length > 0) {
      const resolver = pending.shift();
      if (pending.length === 0) {
        this.pendingRequests.delete(serviceKey);
      }
      if (resolver) {
        conn.inUse = true;
        resolver(client);
      }
    }
  }

  /**
   * 獲取可用連接
   */
  private getAvailableConnection(serviceKey: string): PooledConnection | null {
    const connections = this.connections.get(serviceKey) || [];
    return connections.find((c) => !c.inUse) || null;
  }

  /**
   * 清理過期連接
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 每分鐘檢查一次
  }

  /**
   * 執行清理
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [serviceKey, connections] of this.connections.entries()) {
      const active = connections.filter((conn) => {
        if (conn.inUse) return true;
        if (now - conn.lastUsedAt.getTime() > this.config.maxIdleTimeMs) {
          this.emit('connection:closed', { serviceKey, connectionId: conn.id });
          return false;
        }
        return true;
      });

      if (active.length === 0) {
        this.connections.delete(serviceKey);
      } else {
        this.connections.set(serviceKey, active);
      }
    }
  }

  /**
   * 清空所有連接
   */
  async drain(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const [serviceKey, connections] of this.connections.entries()) {
      for (const conn of connections) {
        try {
          if (typeof conn.client?.close === 'function') {
            await conn.client.close();
          } else if (typeof conn.client?.disconnect === 'function') {
            await conn.client.disconnect();
          }
        } catch (error) {
          console.error(`Error closing connection ${conn.id}:`, error);
        }
      }
    }

    this.connections.clear();
    this.pendingRequests.clear();
  }

  /**
   * 獲取池狀態
   */
  getStatus(): Record<string, { total: number; active: number; idle: number }> {
    const status: Record<string, any> = {};
    for (const [serviceKey, connections] of this.connections.entries()) {
      const active = connections.filter((c) => c.inUse).length;
      status[serviceKey] = {
        total: connections.length,
        active,
        idle: connections.length - active,
      };
    }
    return status;
  }

  /**
   * 強制清除服務的所有連接
   */
  async purge(serviceKey: string): Promise<void> {
    const connections = this.connections.get(serviceKey) || [];
    for (const conn of connections) {
      try {
        if (typeof conn.client?.close === 'function') {
          await conn.client.close();
        }
      } catch (error) {
        console.error(`Error purging connection ${conn.id}:`, error);
      }
    }
    this.connections.delete(serviceKey);
  }
}
