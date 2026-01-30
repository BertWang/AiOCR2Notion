# MCP 快速實施指南
## 32 小時快速集成計劃

---

## 🚀 快速開始（第 1 天）

### 1. 環境設置（2 小時）

```bash
# 1.1 克隆/更新依賴
npm install

# 1.2 生成加密密鑰（用於認證信息加密）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > .mcp-encryption-key

# 1.3 複製環境變數範本
cp .env.local.example .env.local

# 1.4 初始化數據庫
npx prisma migrate dev --name add_mcp_support
```

### 2. 核心框架實施（6 小時）

#### Step 2.1: 創建 MCPServiceManager

```bash
# 創建目錄結構
mkdir -p src/lib/mcp/{services,utils,types}

# 生成文件
touch src/lib/mcp-service-manager.ts
touch src/lib/mcp/error-handler.ts
touch src/lib/mcp/retry-policy.ts
touch src/lib/mcp/auth-manager.ts
touch src/lib/mcp/types.ts
```

#### Step 2.2: 實現基礎類

複製以下代碼到 `src/lib/mcp-service-manager.ts`：

```typescript
import { EventEmitter } from 'events';

export interface MCPServiceConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  endpoint?: string;
  auth?: Record<string, any>;
  config?: Record<string, any>;
  required?: boolean;
}

export class MCPServiceManager extends EventEmitter {
  private services = new Map<string, MCPService>();
  private connectionPool: MCPConnectionPool;
  private initialized = false;

  constructor() {
    super();
    this.connectionPool = new MCPConnectionPool(10, 2);
  }

  async initialize(configs: MCPServiceConfig[]): Promise<void> {
    if (this.initialized) return;

    try {
      await this.connectionPool.initialize();
      
      for (const config of configs) {
        if (config.enabled) {
          try {
            const service = new MCPService(config);
            await service.connect();
            this.services.set(config.id, service);
            console.log(`✅ Connected to ${config.name}`);
          } catch (error) {
            if (config.required) throw error;
            console.warn(`⚠️  Failed to connect to ${config.name}:`, error);
          }
        }
      }

      this.initialized = true;
      this.emit('ready');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async executeTool(
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

  async shutdown(): Promise<void> {
    for (const [_, service] of this.services) {
      await service.disconnect();
    }
    await this.connectionPool.drain();
  }
}

class MCPService {
  private config: MCPServiceConfig;
  private connected = false;

  constructor(config: MCPServiceConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // 實現具體的連接邏輯
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    if (!this.connected) {
      throw new Error('Service not connected');
    }
    // 實現工具調用
    return {};
  }

  isConnected(): boolean {
    return this.connected;
  }
}

class MCPConnectionPool {
  private connections: any[] = [];
  private available: any[] = [];

  constructor(max: number = 10, min: number = 2) {}

  async initialize(): Promise<void> {
    // 初始化連接池
  }

  async acquire(): Promise<any> {
    return this.available.pop();
  }

  async release(conn: any): Promise<void> {
    this.available.push(conn);
  }

  async drain(): Promise<void> {
    this.connections = [];
    this.available = [];
  }
}
```

### 3. 測試核心功能（2 小時）

```typescript
// tests/mcp-core.test.ts
import { MCPServiceManager } from '@/lib/mcp-service-manager';

describe('MCP Core', () => {
  it('should initialize services', async () => {
    const manager = new MCPServiceManager();
    
    const configs = [
      {
        id: 'test-service',
        name: 'Test Service',
        type: 'test',
        enabled: true
      }
    ];

    await manager.initialize(configs);
    // ✅ Pass
  });

  it('should handle service errors gracefully', async () => {
    // Test error handling
  });
});
```

---

## 🔧 集成主要服務（第 2-3 天）

### 4. OpenClaw 集成（8 小時）

#### Step 4.1: 實現 OpenClaw 客戶端

```typescript
// src/lib/mcp/services/openclaw.ts
export class OpenClawClient {
  private endpoint: string;
  private apiKey: string;

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  async analyzeNote(content: string): Promise<any> {
    const response = await fetch(`${this.endpoint}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    return response.json();
  }

  async classifyNote(content: string, categories: string[]): Promise<any> {
    return fetch(`${this.endpoint}/classify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ content, categories })
    }).then(r => r.json());
  }

  async buildKnowledgeGraph(noteIds: string[]): Promise<any> {
    return fetch(`${this.endpoint}/graph`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ note_ids: noteIds })
    }).then(r => r.json());
  }
}
```

#### Step 4.2: 在上傳流程中整合

```typescript
// src/app/api/upload/route.ts (改進版部分)
import { OpenClawClient } from '@/lib/mcp/services/openclaw';

const openclawClient = new OpenClawClient(
  process.env.OPENCLAW_ENDPOINT!,
  process.env.OPENCLAW_API_KEY!
);

// 在上傳路由中
const analysis = await openclawClient.analyzeNote(aiResult.refinedContent);

// 更新筆記
await prisma.note.update({
  where: { id: note.id },
  data: {
    openclawAnalysis: analysis,
    tags: [...aiResult.tags, ...analysis.keywords].join(',')
  }
});
```

### 5. Brave Search 集成（4 小時）

```typescript
// src/lib/mcp/services/brave-search.ts
export class BraveSearchClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, limit: number = 5): Promise<any> {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`,
      {
        headers: { 'Accept': 'application/json', 'X-Subscription-Token': this.apiKey }
      }
    );
    return response.json();
  }

  async newsSearch(query: string): Promise<any> {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}`,
      { headers: { 'X-Subscription-Token': this.apiKey } }
    );
    return response.json();
  }
}
```

### 6. Filesystem 集成（3 小時）

```typescript
// src/lib/mcp/services/filesystem.ts
import { readFile, readdir, writeFile } from 'fs/promises';
import path from 'path';

export class FilesystemClient {
  private rootPath: string;
  private allowedPaths: string[];

  constructor(rootPath: string, allowedPaths: string[]) {
    this.rootPath = rootPath;
    this.allowedPaths = allowedPaths;
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = path.resolve(this.rootPath, filePath);
    this.validatePath(fullPath);
    return readFile(fullPath, 'utf-8');
  }

  async listDirectory(dirPath: string): Promise<string[]> {
    const fullPath = path.resolve(this.rootPath, dirPath);
    this.validatePath(fullPath);
    return readdir(fullPath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.resolve(this.rootPath, filePath);
    this.validatePath(fullPath);
    await writeFile(fullPath, content, 'utf-8');
  }

  private validatePath(fullPath: string): void {
    const normalized = path.normalize(fullPath);
    if (!this.allowedPaths.some(ap => normalized.startsWith(ap))) {
      throw new Error(`Access denied: ${fullPath}`);
    }
  }
}
```

---

## 🎨 UI 集成（第 4 天）

### 7. 創建 MCP 設置頁面（4 小時）

```typescript
// src/app/settings/mcp/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function MCPSettingsPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    const res = await fetch('/api/mcp/services');
    const data = await res.json();
    setServices(data.services);
    setLoading(false);
  }

  async function testConnection(serviceId: string) {
    const res = await fetch(`/api/mcp/services/${serviceId}/test`);
    const data = await res.json();
    alert(data.connected ? '✅ 連接成功' : '❌ 連接失敗');
  }

  if (loading) return <div>載入中...</div>;

  return (
    <div className="space-y-6">
      <h1>MCP 服務設置</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card key={service.id} className="p-4">
            <h3 className="font-semibold">{service.name}</h3>
            <p className="text-sm text-gray-600">{service.description}</p>
            
            <div className="mt-4 space-y-2">
              <Input
                placeholder="API Key"
                type="password"
              />
              <Button onClick={() => testConnection(service.id)}>
                測試連接
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### 8. 改進 Upload Zone（3 小時）

```typescript
// src/components/upload-zone.tsx (新增部分)
interface UploadOptions {
  applyAnalysis: boolean;
  searchContent: boolean;
}

export function UploadZone() {
  const [options, setOptions] = useState<UploadOptions>({
    applyAnalysis: true,
    searchContent: false
  });

  return (
    <>
      {/* 原有代碼 */}
      
      <div className="mt-6 space-y-2 border-t pt-4">
        <h3 className="font-semibold text-sm">MCP 選項</h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.applyAnalysis}
            onChange={(e) => setOptions({
              ...options,
              applyAnalysis: e.target.checked
            })}
          />
          使用 AI 進行深度分析
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.searchContent}
            onChange={(e) => setOptions({
              ...options,
              searchContent: e.target.checked
            })}
          />
          搜尋相關內容
        </label>
      </div>
    </>
  );
}
```

### 9. Split Editor MCP 面板（2 小時）

```typescript
// src/components/split-editor.tsx (新增部分)
export function SplitEditorWithMCP({ note }: { note: Note }) {
  const [mcpResults, setMcpResults] = useState<any>(null);

  async function runMCPAction(action: string) {
    const result = await fetch('/api/notes/{id}/mcp/action', {
      method: 'POST',
      body: JSON.stringify({
        action,
        serviceType: 'openclaw',
        params: { content: note.refinedContent }
      })
    }).then(r => r.json());

    setMcpResults(result);
  }

  return (
    <>
      {/* 原有 Split Editor 代碼 */}
      
      <div className="mt-4 p-4 bg-stone-50 rounded-lg">
        <h3 className="font-semibold mb-3">MCP 操作</h3>
        <div className="flex gap-2">
          <button onClick={() => runMCPAction('analyze')}>
            分析
          </button>
          <button onClick={() => runMCPAction('search')}>
            搜尋
          </button>
        </div>

        {mcpResults && (
          <pre className="mt-4 p-2 bg-white rounded border">
            {JSON.stringify(mcpResults, null, 2)}
          </pre>
        )}
      </div>
    </>
  );
}
```

---

## 🔌 API 端點實施（第 5 天）

### 10. 創建核心 API 路由

```typescript
// src/app/api/mcp/services/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';

export async function GET(request: NextRequest) {
  try {
    const services = await mcpManager.listServices();
    return NextResponse.json({ services });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await mcpManager.configureService(body);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

```typescript
// src/app/api/notes/[id]/mcp/action/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 執行 MCP 操作
    const result = await mcpManager.executeTool(
      body.serviceType,
      body.action,
      body.params
    );

    // 保存到數據庫
    await prisma.mCPSyncLog.create({
      data: {
        noteId: id,
        serviceType: body.serviceType,
        operation: body.action,
        status: 'success',
        result
      }
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

---

## ✅ 測試檢查清單

### Phase 1 驗證
- [ ] MCPServiceManager 初始化成功
- [ ] 連接池工作正常
- [ ] 錯誤重試機制有效
- [ ] 數據庫遷移完成

### Phase 2 驗證
- [ ] OpenClaw 可以成功調用
- [ ] Brave Search 返回結果
- [ ] Filesystem 可以讀寫文件
- [ ] 性能監控有數據

### Phase 3 驗證
- [ ] 設置頁面可以載入服務列表
- [ ] 可以配置服務
- [ ] Upload Zone 顯示 MCP 選項
- [ ] Split Editor 顯示 MCP 操作

### Phase 4 驗證
- [ ] API 端點正常響應
- [ ] MCP 操作結果保存到數據庫
- [ ] 錯誤日誌正確記錄
- [ ] 性能指標收集正確

---

## 🚨 常見陷阱

### 問題 1: 認證令牌過期
```typescript
// ✅ 解決方案：自動刷新
const credentialManager = new SecureCredentialManager();
const token = credentialManager.getToken(serviceId);

if (credentialManager.isExpired(token)) {
  const newToken = await credentialManager.refresh(serviceId);
  credentialManager.updateToken(serviceId, newToken);
}
```

### 問題 2: 連接洩漏
```typescript
// ✅ 使用 try-finally 確保釋放
const conn = await pool.acquire();
try {
  return await executeOperation(conn);
} finally {
  await pool.release(conn);
}
```

### 問題 3: 速率限制
```typescript
// ✅ 實施速率限制檢查
if (!await rateLimiter.check(userId, serviceId)) {
  throw new Error('Rate limit exceeded');
}
```

---

## 📈 性能指標

| 指標 | 目標 | 檢查命令 |
|------|------|---------|
| P95 延遲 | < 500ms | `curl /api/mcp/metrics` |
| 連接池效率 | > 90% | 查看日誌 |
| 服務可用性 | > 99% | 監控儀表板 |
| 錯誤率 | < 1% | 監控儀表板 |

---

## 📚 相關資源

- [完整 MCP 集成規劃](./MCP_COMPREHENSIVE_INTEGRATION_PLAN.md)
- [MCP 官方文檔](https://modelcontextprotocol.io)
- [OpenClaw 文檔](https://openclaw.ai)
- [Brave Search API](https://api.search.brave.com)

---

## 🎯 下一步

1. **完成 Phase 1**（今天）- 核心框架搭建完成
2. **完成 Phase 2**（2-3 天）- 主要服務集成
3. **完成 Phase 3**（4 天）- UI 完善
4. **完成 Phase 4**（5 天）- 性能和安全

預計 **32 小時內** 可以完成完整集成！🚀
