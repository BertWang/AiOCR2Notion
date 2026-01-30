# MCP 架構設計與技術實現指南

## 系統架構圖

### 整體架構

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端層 (React)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Upload Zone  │  │ Split Editor │  │ Settings / Marketplace│ │
│  │ (MCP 選項)   │  │ (MCP 面板)   │  │ (MCP 配置)           │  │
│  └────────┬─────┘  └────────┬─────┘  └────────┬─────────────┘  │
│           │                 │                  │                │
└───────────┼─────────────────┼──────────────────┼────────────────┘
            │                 │                  │
     ┌──────▼─────────────────▼──────────────────▼─────────┐
     │         Next.js API 層 (Backend)                   │
     │  ┌────────────┐  ┌────────────────────────────┐   │
     │  │ /api/upload│  │ /api/notes/[id]/mcp/action│   │
     │  │ /api/notes │  │ /api/mcp/services         │   │
     │  └────────────┘  │ /api/mcp/logs             │   │
     │                  └────────────────────────────┘   │
     └───────────┬────────────────────────────────────────┘
                 │
    ┌────────────▼──────────────────────────────┐
    │  🌟 MCP Integration Layer (核心)          │
    │  ┌────────────────────────────────────┐   │
    │  │ MCPServiceManager                  │   │
    │  │ ├─ 服務生命週期                   │   │
    │  │ ├─ 連接池管理                     │   │
    │  │ ├─ 會話管理                       │   │
    │  │ └─ 錯誤恢復                       │   │
    │  └────────────────────────────────────┘   │
    │  ┌────────────────────────────────────┐   │
    │  │ Service 實例                       │   │
    │  │ ├─ OpenClawClient                  │   │
    │  │ ├─ BraveSearchClient               │   │
    │  │ ├─ GitHubClient                    │   │
    │  │ ├─ SlackClient                     │   │
    │  │ ├─ GoogleDriveClient               │   │
    │  │ ├─ WebCrawlerClient                │   │
    │  │ ├─ SQLiteClient                    │   │
    │  │ └─ FilesystemClient                │   │
    │  └────────────────────────────────────┘   │
    │  ┌────────────────────────────────────┐   │
    │  │ 工具層                             │   │
    │  │ ├─ ConnectionPool                  │   │
    │  │ ├─ RetryPolicy & CircuitBreaker    │   │
    │  │ ├─ AuthManager & CredentialMgr    │   │
    │  │ ├─ RateLimiter                     │   │
    │  │ ├─ Cache Layer                     │   │
    │  │ └─ Performance Monitor             │   │
    │  └────────────────────────────────────┘   │
    └────────┬───────────────────────────────────┘
             │
  ┌──────────▼───────────────────────────────┐
  │  數據持久化層 (Prisma + SQLite)           │
  │  ├─ Note (擴展 MCP 字段)                 │
  │  ├─ MCPServiceConfig                     │
  │  ├─ MCPSyncLog                           │
  │  └─ Cache (可選 Redis)                   │
  └──────────┬───────────────────────────────┘
             │
  ┌──────────▼────────────────────────────────────────────┐
  │  外部 MCP 服務                                        │
  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
  │  │ OpenClaw   │  │ Brave API  │  │ GitHub API     │  │
  │  └────────────┘  └────────────┘  └────────────────┘  │
  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
  │  │ Slack API  │  │ Google API │  │ Notion API     │  │
  │  └────────────┘  └────────────┘  └────────────────┘  │
  └───────────────────────────────────────────────────────┘
```

### 請求流程圖

```
用戶上傳圖片
     │
     ▼
┌─────────────────┐
│ Upload Component│ (前端)
│ 選擇 MCP 選項   │
└────────┬────────┘
         │ POST /api/upload
         ▼
  ┌─────────────────────────────┐
  │ Upload Route Handler        │
  │ 1. 保存文件                 │
  │ 2. 創建 Note 記錄           │
  └────────┬────────────────────┘
           │
           ▼
  ┌─────────────────────────────┐
  │ Gemini AI 處理              │
  │ OCR → Markdown → Summary    │
  └────────┬────────────────────┘
           │
           ▼
  ┌─────────────────────────────┐
  │ MCP 後處理 (如果選中)       │
  │                             │
  │ ┌─ OpenClaw 分析           │
  │ ├─ Brave Search 查找       │
  │ ├─ Notion 同步             │
  │ └─ Slack 通知              │
  └────────┬────────────────────┘
           │
           ▼
  ┌─────────────────────────────┐
  │ 保存到 SQLite               │
  │ 更新 Note 記錄              │
  │ 記錄 MCP 操作日誌           │
  └────────┬────────────────────┘
           │
           ▼
  ┌─────────────────────────────┐
  │ 返回前端                    │
  │ revalidatePath('/')         │
  └────────┬────────────────────┘
           │
           ▼
  用戶在 Dashboard 看到新筆記
  可以查看 MCP 處理結果
```

---

## 核心模塊詳細設計

### 1. MCPServiceManager 實現

#### 文件結構
```
src/lib/mcp/
├── index.ts                    # 主入口，導出 manager 單例
├── types.ts                    # 共用型別定義
├── service-manager.ts          # 核心管理類
├── connection-pool.ts          # 連接池
├── session-manager.ts          # 會話管理
├── error-handler.ts            # 錯誤處理
├── retry-policy.ts             # 重試策略
├── auth-manager.ts             # 認證管理
├── rate-limiter.ts             # 速率限制
├── cache.ts                    # 緩存層
├── monitor.ts                  # 性能監控
├── services/                   # 各個服務實現
│   ├── base-client.ts
│   ├── openclaw/
│   ├── brave-search/
│   ├── github/
│   ├── slack/
│   ├── google-drive/
│   ├── web-crawler/
│   ├── sqlite/
│   └── filesystem/
└── utils/                      # 工具函數
    ├── encryption.ts
    ├── validation.ts
    └── helpers.ts
```

#### MCPServiceManager 核心代碼

```typescript
// src/lib/mcp/service-manager.ts

import { EventEmitter } from 'events';
import { MCPConnectionPool } from './connection-pool';
import { MCPSessionManager } from './session-manager';
import { MCPAuthManager } from './auth-manager';
import { CircuitBreaker } from './error-handler';
import { RetryPolicy } from './retry-policy';

export interface MCPServiceConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  endpoint?: string;
  auth?: {
    type: 'api_key' | 'oauth' | 'jwt' | 'basic';
    credentials?: Record<string, string>;
  };
  config?: Record<string, any>;
  required?: boolean;
  timeout?: number;
}

export interface MCPOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  metadata?: Record<string, any>;
}

export class MCPServiceManager extends EventEmitter {
  private services = new Map<string, MCPService>();
  private connectionPool: MCPConnectionPool;
  private sessionManager: MCPSessionManager;
  private authManager: MCPAuthManager;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private initialized = false;

  constructor() {
    super();
    this.connectionPool = new MCPConnectionPool(10, 2);
    this.sessionManager = new MCPSessionManager();
    this.authManager = new MCPAuthManager();
  }

  /**
   * 初始化管理器並連接所有啟用的服務
   */
  async initialize(configs: MCPServiceConfig[]): Promise<void> {
    if (this.initialized) {
      console.warn('MCPServiceManager already initialized');
      return;
    }

    try {
      console.log('Initializing MCPServiceManager...');

      // 1. 初始化連接池
      await this.connectionPool.initialize();
      console.log('✅ Connection pool initialized');

      // 2. 啟動會話清理器
      this.sessionManager.startCleanupTimer();
      console.log('✅ Session manager started');

      // 3. 連接所有啟用的服務
      const connections = await Promise.allSettled(
        configs.map(config => this.connectService(config))
      );

      let successCount = 0;
      for (const result of connections) {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          console.error('Service connection failed:', result.reason);
        }
      }

      console.log(`✅ ${successCount}/${configs.length} services connected`);

      // 4. 執行健康檢查
      await this.healthCheck();

      this.initialized = true;
      this.emit('ready');
    } catch (error) {
      console.error('MCPServiceManager initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 連接單個服務
   */
  private async connectService(config: MCPServiceConfig): Promise<void> {
    try {
      const service = this.createService(config);

      // 設置熔斷器
      this.circuitBreakers.set(config.id, new CircuitBreaker());

      // 連接
      await service.connect();
      this.services.set(config.id, service);

      console.log(`✅ Connected to ${config.name}`);
      this.emit('service-connected', { serviceId: config.id, name: config.name });
    } catch (error) {
      if (config.required) {
        throw error;
      }
      console.warn(`⚠️  Failed to connect to ${config.name}:`, error);
      this.emit('service-connection-failed', { serviceId: config.id, error });
    }
  }

  /**
   * 創建服務實例（工廠模式）
   */
  private createService(config: MCPServiceConfig): MCPService {
    // 根據服務類型創建相應的客戶端
    switch (config.type) {
      case 'openclaw':
        return new OpenClawService(config);
      case 'brave-search':
        return new BraveSearchService(config);
      case 'github':
        return new GitHubService(config);
      case 'slack':
        return new SlackService(config);
      case 'google-drive':
        return new GoogleDriveService(config);
      case 'web-crawler':
        return new WebCrawlerService(config);
      case 'sqlite':
        return new SQLiteService(config);
      case 'filesystem':
        return new FilesystemService(config);
      default:
        throw new Error(`Unknown service type: ${config.type}`);
    }
  }

  /**
   * 執行工具
   */
  async executeTool<T>(
    serviceId: string,
    toolName: string,
    args: Record<string, any>,
    options?: { timeout?: number; retryCount?: number }
  ): Promise<MCPOperationResult> {
    const startTime = Date.now();

    try {
      // 1. 檢查熔斷器
      const breaker = this.circuitBreakers.get(serviceId);
      if (breaker?.isOpen()) {
        throw new Error(`Circuit breaker is open for ${serviceId}`);
      }

      // 2. 檢查速率限制
      if (!(await this.checkRateLimit(serviceId))) {
        throw new Error(`Rate limit exceeded for ${serviceId}`);
      }

      // 3. 檢查認證
      await this.authManager.validateService(serviceId);

      // 4. 從連接池獲取連接
      const connection = await this.connectionPool.acquire();

      try {
        // 5. 執行工具（帶重試）
        const result = await this.executeWithRetry(
          () => this.callTool(serviceId, toolName, args),
          options?.retryCount || 3
        );

        // 6. 記錄成功
        breaker?.recordSuccess();

        return {
          success: true,
          data: result,
          executionTime: Date.now() - startTime
        };
      } finally {
        // 7. 釋放連接
        await this.connectionPool.release(connection);
      }
    } catch (error) {
      // 記錄失敗
      const breaker = this.circuitBreakers.get(serviceId);
      breaker?.recordFailure();

      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 帶重試的工具調用
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // 檢查是否應該重試
        const shouldRetry = this.shouldRetryError(error);
        if (!shouldRetry || attempt === maxRetries) {
          throw error;
        }

        // 指數退避
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * 決定是否應該重試
   */
  private shouldRetryError(error: any): boolean {
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Rate limit',
      'Too many requests'
    ];

    const errorMessage = String(error);
    return retryableErrors.some(msg => errorMessage.includes(msg));
  }

  /**
   * 實際調用工具
   */
  private async callTool(
    serviceId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    return service.callTool(toolName, args);
  }

  /**
   * 檢查速率限制
   */
  private async checkRateLimit(serviceId: string): Promise<boolean> {
    // 實現速率限制邏輯
    return true;
  }

  /**
   * 健康檢查
   */
  private async healthCheck(): Promise<void> {
    console.log('Running health check...');

    const checks = Array.from(this.services.entries()).map(
      async ([serviceId, service]) => {
        try {
          const healthy = await service.healthCheck();
          return { serviceId, healthy };
        } catch (error) {
          return { serviceId, healthy: false, error };
        }
      }
    );

    const results = await Promise.all(checks);
    for (const result of results) {
      if (result.healthy) {
        console.log(`✅ ${result.serviceId} is healthy`);
      } else {
        console.warn(`⚠️  ${result.serviceId} health check failed`);
      }
    }
  }

  /**
   * 關閉管理器
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down MCPServiceManager...');

    // 關閉所有服務
    const shutdownPromises = Array.from(this.services.values()).map(service =>
      service.disconnect().catch(error => {
        console.error(`Error closing service:`, error);
      })
    );

    await Promise.all(shutdownPromises);

    // 關閉連接池
    await this.connectionPool.drain();

    console.log('✅ MCPServiceManager shutdown complete');
    this.initialized = false;
  }

  /**
   * 獲取服務狀態
   */
  getServiceStatus(serviceId: string): any {
    const service = this.services.get(serviceId);
    const breaker = this.circuitBreakers.get(serviceId);

    return {
      connected: service?.isConnected() ?? false,
      circuitBreakerOpen: breaker?.isOpen() ?? false,
      lastCheck: service?.getLastHealthCheck() ?? null
    };
  }

  /**
   * 獲取所有服務狀態
   */
  getAllServiceStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    for (const serviceId of this.services.keys()) {
      status[serviceId] = this.getServiceStatus(serviceId);
    }
    return status;
  }
}

/**
 * 基礎服務類
 */
export abstract class MCPService {
  protected config: MCPServiceConfig;
  protected connected: boolean = false;
  protected lastHealthCheck: Date | null = null;

  constructor(config: MCPServiceConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract callTool(toolName: string, args: Record<string, any>): Promise<any>;

  async healthCheck(): Promise<boolean> {
    this.lastHealthCheck = new Date();
    return this.connected;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck;
  }
}

// 單例
let mcpManager: MCPServiceManager | null = null;

export function getMCPManager(): MCPServiceManager {
  if (!mcpManager) {
    mcpManager = new MCPServiceManager();
  }
  return mcpManager;
}
```

### 2. 數據庫遷移

```prisma
// prisma/migrations/[timestamp]_add_mcp_support/migration.sql

-- 擴展 Note 表
ALTER TABLE "Note" ADD COLUMN "mcpMetadata" TEXT;
ALTER TABLE "Note" ADD COLUMN "mcpServices" TEXT;
ALTER TABLE "Note" ADD COLUMN "openclawAnalysis" TEXT;
ALTER TABLE "Note" ADD COLUMN "braveSearchResults" TEXT;
ALTER TABLE "Note" ADD COLUMN "notionPageId" TEXT;
ALTER TABLE "Note" ADD COLUMN "githubGistId" TEXT;
ALTER TABLE "Note" ADD COLUMN "slackThreadTs" TEXT;
ALTER TABLE "Note" ADD COLUMN "syncStatus" TEXT;
ALTER TABLE "Note" ADD COLUMN "lastMCPUpdate" DATETIME;

-- 創建 MCPServiceConfig 表
CREATE TABLE "MCPServiceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT NOT NULL,
    "credentials" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- 創建 MCPSyncLog 表
CREATE TABLE "MCPSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE
);

-- 創建索引
CREATE INDEX "MCPSyncLog_noteId" ON "MCPSyncLog"("noteId");
CREATE INDEX "MCPSyncLog_serviceType" ON "MCPSyncLog"("serviceType");
CREATE INDEX "MCPSyncLog_createdAt" ON "MCPSyncLog"("createdAt");
```

### 3. API 端點實現

#### 服務管理端點

```typescript
// src/app/api/mcp/services/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getMCPManager } from '@/lib/mcp';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mcp/services
 * 獲取所有 MCP 服務配置
 */
export async function GET(request: NextRequest) {
  try {
    const configs = await prisma.mCPServiceConfig.findMany();
    
    const manager = getMCPManager();
    const statuses = manager.getAllServiceStatus();

    return NextResponse.json({
      success: true,
      services: configs.map(config => ({
        ...config,
        status: statuses[config.serviceType]
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp/services
 * 創建/配置 MCP 服務
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const config = await prisma.mCPServiceConfig.create({
      data: {
        serviceType: body.serviceType,
        enabled: body.enabled ?? true,
        config: JSON.stringify(body.config || {}),
        credentials: body.credentials ? encryptCredentials(body.credentials) : null
      }
    });

    return NextResponse.json({
      success: true,
      config
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 400 }
    );
  }
}
```

#### 筆記 MCP 操作端點

```typescript
// src/app/api/notes/[id]/mcp/action/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getMCPManager } from '@/lib/mcp';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 獲取筆記
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    // 執行 MCP 操作
    const manager = getMCPManager();
    const result = await manager.executeTool(
      body.serviceType,
      body.action,
      {
        ...body.params,
        content: note.refinedContent || note.rawOcrText
      }
    );

    // 記錄操作日誌
    await prisma.mCPSyncLog.create({
      data: {
        noteId: id,
        serviceType: body.serviceType,
        operation: body.action,
        status: result.success ? 'success' : 'failed',
        result: result.data ? JSON.stringify(result.data) : null,
        error: result.error || null
      }
    });

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

---

## 性能優化策略

### 1. 連接池配置

```typescript
// 根據不同的場景調整
const poolConfigs = {
  // 開發環境
  development: { min: 2, max: 5 },
  
  // 生產環境
  production: { min: 10, max: 50 },
  
  // 高負載場景
  highLoad: { min: 20, max: 100 }
};
```

### 2. 緩存策略

```typescript
// 緩存配置
const cacheConfig = {
  // 相同查詢在 5 分鐘內返回緩存
  queryResultTTL: 300000,
  
  // 最多緩存 1000 個查詢結果
  maxQueryCache: 1000,
  
  // 服務配置緩存 1 小時
  configCacheTTL: 3600000
};
```

### 3. 批量操作優化

```typescript
// 批量分析多個筆記
async function analyzeNotesBatch(noteIds: string[]) {
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < noteIds.length; i += batchSize) {
    const batch = noteIds.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(noteId => 
        manager.executeTool('openclaw', 'analyze', { noteId })
      )
    );

    results.push(...batchResults);
  }

  return results;
}
```

---

## 監控和告警

### 關鍵指標

| 指標 | 告警閾值 | 檢查頻率 |
|------|---------|---------|
| 連接池使用率 | > 80% | 每分鐘 |
| 服務響應時間 | > 5s | 每請求 |
| 錯誤率 | > 5% | 每分鐘 |
| 熔斷器狀態 | Open | 實時 |
| 認證失敗 | 任何失敗 | 實時 |

### 監控實現

```typescript
// src/lib/mcp/monitor.ts

export class MCPMonitor {
  private metrics = new Map<string, Metric[]>();

  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const key = this.getKey(name, tags);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push({
      timestamp: Date.now(),
      value,
      tags
    });

    // 檢查告警條件
    this.checkAlerts(name, value);
  }

  private checkAlerts(name: string, value: number) {
    const thresholds: Record<string, number> = {
      'connection_pool_usage': 0.8,
      'service_response_time': 5000,
      'error_rate': 0.05
    };

    if (value > (thresholds[name] || Infinity)) {
      this.emitAlert(name, value);
    }
  }

  private emitAlert(name: string, value: number) {
    console.warn(`⚠️  Alert: ${name} = ${value}`);
    // 發送告警通知 (Slack, 郵件等)
  }

  getMetrics(name: string, timeRange: number = 3600000): Metric[] {
    const now = Date.now();
    const allMetrics = Array.from(this.metrics.values()).flat();

    return allMetrics.filter(
      m => m.timestamp > now - timeRange
    );
  }
}

interface Metric {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}
```

---

## 安全最佳實踐

### 1. 認證信息加密

```typescript
// 所有敏感信息必須加密存儲
const encrypted = encrypt({
  apiKey: process.env.OPENCLAW_API_KEY,
  token: process.env.NOTION_TOKEN
});

await prisma.mCPServiceConfig.create({
  data: {
    credentials: encrypted
  }
});
```

### 2. 速率限制

```typescript
// 實施多層速率限制
rateLimiter.setLimit({
  // 全局: 每分鐘 1000 個請求
  global: 1000,
  
  // 每個用戶: 每分鐘 100 個請求
  perUser: 100,
  
  // 每個服務: 每分鐘 500 個請求
  perService: 500,
  
  // 每個 IP: 每分鐘 200 個請求
  perIP: 200
});
```

### 3. 權限驗證

```typescript
// 檢查用戶是否有權使用特定服務
async function authorizeToolAccess(userId: string, serviceId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permissions: true }
  });

  return user?.permissions.some(p => p.serviceId === serviceId) ?? false;
}
```

---

## 故障排除指南

### 常見問題和解決方案

#### Q: 連接超時
```typescript
// 原因: 服務不可達或配置錯誤
// 解決:
1. 檢查 endpoint 配置是否正確
2. 檢查防火牆和網絡連接
3. 增加超時時間 (config.timeout)
4. 啟用調試日誌
```

#### Q: 認證失敗
```typescript
// 原因: 令牌過期或無效
// 解決:
1. 檢查認證令牌是否正確
2. 嘗試刷新令牌
3. 檢查令牌是否過期
4. 確認權限範圍是否足夠
```

#### Q: 速率限制錯誤
```typescript
// 原因: 請求過於頻繁
// 解決:
1. 實施指數退避重試
2. 使用批量操作
3. 增加速率限制
4. 使用緩存減少請求
```

---

這份文檔提供了 MCP 架構的完整技術實現細節，可直接用於生產環境開發。
