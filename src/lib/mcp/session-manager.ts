// src/lib/mcp/session-manager.ts
// MCP 會話管理

import { MCPSession, MCPServiceType } from './types';

interface SessionConfig {
  sessionTimeoutMinutes: number;
  maxSessionsPerService: number;
  enablePersistence: boolean;
}

const DEFAULT_CONFIG: SessionConfig = {
  sessionTimeoutMinutes: 30,
  maxSessionsPerService: 100,
  enablePersistence: false,
};

/**
 * MCP 會話管理器 - 跟蹤和管理服務會話生命週期
 */
export class SessionManager {
  private sessions: Map<string, MCPSession> = new Map();
  private serviceSessionIndex: Map<MCPServiceType, Set<string>> = new Map();
  private config: SessionConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  /**
   * 創建新會話
   */
  createSession(
    serviceType: MCPServiceType,
    metadata?: Record<string, any>
  ): string {
    const sessionId = `session-${serviceType}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.sessionTimeoutMinutes * 60 * 1000
    );

    const session: MCPSession = {
      id: sessionId,
      serviceType,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      metadata,
    };

    this.sessions.set(sessionId, session);

    // 索引會話
    if (!this.serviceSessionIndex.has(serviceType)) {
      this.serviceSessionIndex.set(serviceType, new Set());
    }
    this.serviceSessionIndex.get(serviceType)!.add(sessionId);

    // 檢查上限
    const sessionCount = this.serviceSessionIndex.get(serviceType)!.size;
    if (sessionCount > this.config.maxSessionsPerService) {
      this.pruneOldestSession(serviceType);
    }

    return sessionId;
  }

  /**
   * 獲取會話
   */
  getSession(sessionId: string): MCPSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // 檢查是否過期
    if (session.expiresAt < new Date()) {
      this.destroySession(sessionId);
      return null;
    }

    // 更新訪問時間
    session.lastAccessedAt = new Date();
    return session;
  }

  /**
   * 更新會話元數據
   */
  updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, any>
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    session.metadata = { ...(session.metadata || {}), ...metadata };
    return true;
  }

  /**
   * 銷毀會話
   */
  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);
    const index = this.serviceSessionIndex.get(session.serviceType);
    if (index) {
      index.delete(sessionId);
    }

    return true;
  }

  /**
   * 銷毀服務的所有會話
   */
  destroyServiceSessions(serviceType: MCPServiceType): number {
    const sessionIds = this.serviceSessionIndex.get(serviceType) || new Set<string>();
    let destroyed = 0;

    for (const sessionId of sessionIds) {
      if (this.destroySession(sessionId)) {
        destroyed++;
      }
    }

    return destroyed;
  }

  /**
   * 延長會話過期時間
   */
  extendSession(sessionId: string, minutes?: number): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const extensionMinutes =
      minutes !== undefined ? minutes : this.config.sessionTimeoutMinutes;
    session.expiresAt = new Date(
      new Date().getTime() + extensionMinutes * 60 * 1000
    );

    return true;
  }

  /**
   * 獲取服務的活躍會話數
   */
  getActiveSessionCount(serviceType: MCPServiceType): number {
    const sessionIds = this.serviceSessionIndex.get(serviceType) || new Set<string>();
    let count = 0;

    for (const sessionId of sessionIds) {
      if (this.getSession(sessionId)) {
        count++;
      }
    }

    return count;
  }

  /**
   * 獲取所有活躍會話
   */
  getAllActiveSessions(): MCPSession[] {
    const active: MCPSession[] = [];
    const now = new Date();

    for (const session of this.sessions.values()) {
      if (session.expiresAt > now) {
        active.push(session);
      }
    }

    return active;
  }

  /**
   * 清理過期會話
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 每5分鐘檢查一次
  }

  /**
   * 執行清理
   */
  private cleanup(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.destroySession(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.debug(
        `[SessionManager] Cleaned up ${expiredSessions.length} expired sessions`
      );
    }
  }

  /**
   * 移除最舊的會話
   */
  private pruneOldestSession(serviceType: MCPServiceType): void {
    const sessionIds = this.serviceSessionIndex.get(serviceType) || new Set();
    let oldestId: string | null = null;
    let oldestTime = Date.now();

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.createdAt.getTime() < oldestTime) {
        oldestTime = session.createdAt.getTime();
        oldestId = sessionId;
      }
    }

    if (oldestId) {
      this.destroySession(oldestId);
    }
  }

  /**
   * 獲取會話統計
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {
      totalSessions: this.sessions.size,
      activeSessions: this.getAllActiveSessions().length,
    };

    for (const [serviceType, sessionIds] of this.serviceSessionIndex.entries()) {
      const activeSessions = Array.from(sessionIds).filter(
        (id: string) => this.getSession(id) !== null
      ).length;
      stats[`${serviceType}_sessions`] = activeSessions;
    }

    return stats;
  }

  /**
   * 清空所有會話
   */
  clear(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.sessions.clear();
    this.serviceSessionIndex.clear();
  }
}
