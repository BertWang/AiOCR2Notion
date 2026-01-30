# MCP 集成 - 前後端實施計劃

## 📋 項目概述

### 目標
將 MCP (Model Context Protocol) 集成到 TestMoltbot，提供：
1. **MCP 服務管理** - 添加、配置、刪除服務
2. **快速設置** - 預設配置 8+ 常見服務
3. **智能集成** - 在筆記處理中自動調用 MCP 服務
4. **完整 CRUD** - 完整的生命週期管理

---

## 🏗️ 系統架構

### 三層架構

```
前端層 (React + Next.js)
├─ MCP 服務管理頁面
├─ 服務配置表單
├─ 快速模板選擇
└─ 操作日誌查看

      ↓ HTTP API

應用層 (Next.js Routes)
├─ /api/mcp/services (CRUD)
├─ /api/mcp/config (配置驗證)
├─ /api/mcp/sync (觸發同步)
├─ /api/mcp/logs (查看日誌)
└─ /api/notes/[id]/mcp-process (筆記處理)

      ↓ 業務邏輯

核心層 (MCP Integration)
├─ MCPServiceManager (服務管理)
├─ ConnectionPool (連接複用)
├─ SessionManager (會話管理)
├─ RetryPolicy (錯誤恢復)
├─ AuthManager (認證)
├─ RateLimiter (速率控制)
├─ CacheLayer (結果緩存)
└─ 8 個服務客戶端 (OpenClaw, Brave, GitHub 等)

      ↓ 數據持久化

數據層 (Prisma + SQLite)
├─ Note (擴展 MCP 字段)
├─ MCPServiceConfig (服務配置)
├─ MCPSyncLog (操作日誌)
└─ MCPCache (可選快取)
```

---

## 📅 Phase 1: 核心框架實施 (Week 1-2)

### 後端實施計劃

#### 1.1 數據模型擴展

**文件**: `prisma/schema.prisma`

新增表:
```prisma
// MCP 服務配置表
model MCPServiceConfig {
  id String @id @default(cuid())
  name String
  type String // openclaw, brave, github, slack 等
  enabled Boolean @default(false)
  endpoint String?
  authType String? // api_key, oauth, jwt
  credentials String? // 加密存儲
  config Json? // 服務特定配置
  retryPolicy String? // 重試策略
  rateLimitPerMinute Int? // 速率限制
  timeoutMs Int? // 超時設置
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId String? // 可選: 多用戶支持
  
  @@unique([name, userId])
}

// MCP 同步日誌表
model MCPSyncLog {
  id String @id @default(cuid())
  noteId String
  serviceName String
  action String // process, extract, sync, notify
  status String // pending, processing, success, failed
  input Json?
  output Json?
  error String?
  executionTimeMs Int?
  createdAt DateTime @default(now())
  
  note Note @relation(fields: [noteId], references: [id], onDelete: Cascade)
  
  @@index([noteId, serviceName])
  @@index([createdAt])
}

// 擴展 Note 模型
model Note {
  // ... 現有字段 ...
  
  // MCP 相關字段
  mcpServicesUsed String[] @default([]) // 使用過的服務列表
  mcpMetadata Json? // 存儲 MCP 操作結果
  syncLogs MCPSyncLog[]
}
```

**遷移命令**:
```bash
npx prisma migrate dev --name add_mcp_support
```

#### 1.2 核心類實現

**文件**: `src/lib/mcp/`

```
src/lib/mcp/
├── types.ts              # 類型定義
├── service-manager.ts    # 核心管理器
├── connection-pool.ts    # 連接池
├── session-manager.ts    # 會話管理
├── error-handler.ts      # 錯誤處理
├── retry-policy.ts       # 重試策略
├── auth-manager.ts       # 認證管理
├── rate-limiter.ts       # 速率限制
├── cache.ts              # 快取層
├── monitor.ts            # 性能監控
└── services/
    ├── base-client.ts    # 基類
    ├── openclaw-client.ts
    ├── brave-search-client.ts
    ├── github-client.ts
    ├── slack-client.ts
    ├── google-drive-client.ts
    ├── web-crawler-client.ts
    ├── sqlite-client.ts
    └── filesystem-client.ts
```

#### 1.3 API 路由實現

**文件**: `src/app/api/mcp/`

```
src/app/api/mcp/
├── services/
│   ├── route.ts          # GET /api/mcp/services (列表)
│   └── [id]/
│       ├── route.ts      # GET/PUT/DELETE 單個服務
│       └── test/route.ts # POST 測試連接
├── config/
│   ├── route.ts          # POST 驗證配置
│   └── templates/route.ts # GET 快速模板
├── sync/route.ts         # POST 觸發同步
└── logs/route.ts         # GET 查看日誌
```

### 前端實施計劃

#### 2.1 新增頁面和組件

**文件**: `src/app/mcp/` (新建)

```
src/app/mcp/
├── page.tsx              # MCP 管理頁面
├── layout.tsx            # 布局
├── components/
│   ├── service-list.tsx  # 服務列表
│   ├── service-form.tsx  # 配置表單
│   ├── template-picker.tsx # 快速模板
│   ├── test-button.tsx   # 測試連接
│   ├── log-viewer.tsx    # 日誌查看
│   └── status-card.tsx   # 狀態卡片
```

#### 2.2 設置頁面集成

修改 `src/components/settings-wizard.tsx`:
- 添加「MCP 服務」標籤
- 集成 MCP 管理組件

#### 2.3 注上傳流程集成

修改 `src/components/upload-zone.tsx`:
- 添加 MCP 服務選擇
- 上傳時選擇要用的服務

---

## 📅 Phase 2: 常見服務集成 (Week 2-3)

### 實施 8 個核心服務

#### 2.1 OpenClaw 集成
- **用途**: 筆記內容分析和標籤化
- **API**: RESTful API
- **認證**: API Key
- **操作**: 分析、摘要、標籤提取

#### 2.2 Brave Search 集成
- **用途**: 查詢相關資訊
- **API**: REST API
- **認證**: API Key
- **操作**: 搜尋、結果聚合

#### 2.3 GitHub 集成
- **用途**: 代碼倉庫查詢
- **API**: GraphQL + REST
- **認證**: OAuth / Personal Token
- **操作**: 搜尋代碼、創建問題、同步

#### 2.4 Slack 集成
- **用途**: 工作流通知和協作
- **API**: Webhooks + REST
- **認證**: Bot Token
- **操作**: 發送訊息、建立頻道

#### 2.5-2.8 其他服務
- Google Drive: 同步到雲端
- Web Crawler: 爬取網頁內容
- SQLite: 本地數據查詢
- Filesystem: 本地文件操作

---

## 📅 Phase 3: UI/UX 完善 (Week 3-4)

### 3.1 MCP 管理頁面
- 服務列表展示
- 配置表單設計
- 連接測試按鈕
- 快速模板選擇

### 3.2 Dashboard 增強
- MCP 狀態摘要
- 最近操作記錄
- 服務健康檢查

### 3.3 筆記編輯器增強
- MCP 操作面板
- 快速操作按鈕
- 結果展示區域

---

## 🔧 技術棧選擇

### 後端技術
- **Node.js 運行時**: 20+
- **MCP 協議版本**: 1.0+
- **連接管理**: 自實現連接池
- **重試策略**: 指數退避 + 熔斷器
- **認證方式**: 多種支持 (API Key, OAuth, JWT)
- **緩存**: Redis (可選) 或記憶體

### 前端技術
- **React**: 18+
- **UI 組件**: Shadcn/ui
- **表單**: React Hook Form
- **驗證**: Zod
- **數據管理**: React Query

### 數據存儲
- **主要**: SQLite (Prisma)
- **可選**: Redis (會話 + 快取)
- **配置管理**: 環境變數 + 數據庫

---

## ⚙️ 環境配置

### .env.local

```env
# MCP 全局設置
MCP_ENABLED=true
MCP_TIMEOUT_MS=30000
MCP_MAX_RETRIES=3

# OpenClaw
OPENCLAW_API_KEY=xxx
OPENCLAW_ENDPOINT=https://api.openclaw.ai

# Brave Search
BRAVE_SEARCH_API_KEY=xxx

# GitHub
GITHUB_TOKEN=xxx
GITHUB_OAUTH_CLIENT_ID=xxx
GITHUB_OAUTH_CLIENT_SECRET=xxx

# Slack
SLACK_BOT_TOKEN=xxx
SLACK_WEBHOOK_URL=xxx

# 其他服務...
GOOGLE_API_KEY=xxx
```

---

## 📊 數據庫設計

### MCPServiceConfig 配置存儲

```typescript
{
  id: "service_1",
  name: "OpenClaw 分析",
  type: "openclaw",
  enabled: true,
  endpoint: "https://api.openclaw.ai/v1",
  authType: "api_key",
  credentials: "encrypted_key_xxx", // 加密存儲
  config: {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 2000
  },
  retryPolicy: "exponential",
  rateLimitPerMinute: 60,
  timeoutMs: 30000
}
```

### MCPSyncLog 操作日誌

```typescript
{
  id: "log_1",
  noteId: "note_123",
  serviceName: "openclaw",
  action: "analyze",
  status: "success",
  input: {
    content: "...",
    options: {}
  },
  output: {
    summary: "...",
    tags: [],
    score: 0.95
  },
  executionTimeMs: 1234
}
```

---

## 🧪 測試計劃

### 單元測試
- [ ] MCPServiceManager 類
- [ ] 連接池邏輯
- [ ] 重試策略
- [ ] 認證管理

### 集成測試
- [ ] 服務連接
- [ ] API 端點
- [ ] 數據庫操作
- [ ] 錯誤恢復

### E2E 測試
- [ ] 完整上傳流程
- [ ] MCP 服務執行
- [ ] 結果持久化
- [ ] UI 交互

---

## 📈 進度追蹤

| Phase | 任務 | 預計時間 | 狀態 |
|-------|------|---------|------|
| 1 | 數據模型 + 核心框架 | 15h | ⏳ 準備 |
| 1 | API 路由基礎 | 8h | ⏳ 準備 |
| 1 | 前端頁面框架 | 10h | ⏳ 準備 |
| 2 | OpenClaw 集成 | 5h | ⏳ 準備 |
| 2 | Brave Search 集成 | 4h | ⏳ 準備 |
| 2 | GitHub 集成 | 6h | ⏳ 準備 |
| 2 | Slack 集成 | 4h | ⏳ 準備 |
| 3 | UI/UX 完善 | 20h | ⏳ 準備 |
| 3 | 測試和文檔 | 10h | ⏳ 準備 |

**總計**: 80-100 小時

---

## ⚠️ 風險管理

### 技術風險
1. **API 限制** - 每個服務有不同的速率限制
   - 緩解: 實現速率限制和隊列
2. **認證複雜性** - 不同服務的認證方式不同
   - 緩解: 統一的認證管理層
3. **超時管理** - 不同服務響應時間不同
   - 緩解: 可配置的超時設置

### 時間風險
1. **依賴外部 API** - API 文檔可能不完整
   - 緩解: 提前進行原型開發
2. **服務變更** - API 版本更新
   - 緩解: 版本管理和適配層

---

## 🎯 優先級

### P0 (必須)
- [ ] MCP 服務管理 CRUD
- [ ] 3-4 個核心服務集成
- [ ] 基本 UI 界面

### P1 (重要)
- [ ] 其他 4 個服務集成
- [ ] 完整 UI/UX
- [ ] 錯誤處理和重試

### P2 (優化)
- [ ] 緩存層
- [ ] 性能優化
- [ ] 高級監控

---

## 📞 依賴關係

```
前端 UI
  ↓
API 路由
  ↓
核心類 (Manager/Client)
  ↓
數據模型 (Prisma Schema)
  ↓
外部 API
```

實施順序:
1. 數據模型 ✓
2. 核心類 ✓
3. API 路由 ✓
4. 前端 UI ✓

---

## 📎 相關文檔

- [MCP_COMPREHENSIVE_INTEGRATION_PLAN.md](./MCP_COMPREHENSIVE_INTEGRATION_PLAN.md) - 完整技術規劃
- [MCP_TECHNICAL_IMPLEMENTATION.md](./MCP_TECHNICAL_IMPLEMENTATION.md) - 實現細節
- [MCP_SERVICES_CONFIG_REFERENCE.md](./MCP_SERVICES_CONFIG_REFERENCE.md) - 服務配置
- [MCP_QUICK_START_32H.md](./MCP_QUICK_START_32H.md) - 快速入門

---

**狀態**: 📋 計劃階段  
**下一步**: 開始 Phase 1 - 數據模型擴展
