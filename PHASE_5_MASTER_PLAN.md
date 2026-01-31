# Phase 5 綜合優化計劃 - Mobile + AI + Performance

**開始日期**: 2026-01-31  
**預計完成**: 2026-02-07 (8 天)  
**整合方向**: 移動端優化 + 進階 AI 功能 + 性能擴展  

---

## 🎯 總體目標

打造一個**高性能、智能化、跨平台**的筆記系統：
- 📱 移動端友善（PWA、響應式、觸控優化）
- 🧠 智能關聯（知識圖譜、自動問答、筆記推薦）
- ⚡ 極速體驗（資料庫優化、圖片 CDN、快取機制）

---

## 📋 Phase 5.1: 移動端優化 (Option A)

### 5.1.1 PWA 支援 ✨
**目標**: 讓用戶可以「安裝」應用到手機桌面，支援離線瀏覽

#### 實施內容
- [ ] **Web App Manifest** (`public/manifest.json`)
  ```json
  {
    "name": "TestMoltbot - 智能筆記",
    "short_name": "Moltbot",
    "description": "手寫筆記數字化助手",
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#1c1917",
    "background_color": "#fafaf9",
    "icons": [...]
  }
  ```

- [ ] **Service Worker** (離線支援)
  - 快取靜態資源（CSS、JS、字體）
  - 快取已訪問筆記（IndexedDB）
  - 離線時顯示已緩存內容
  - 背景同步上傳（Network available 時）

- [ ] **安裝提示** (Install Prompt)
  - 偵測 PWA 安裝能力
  - 顯示友善的安裝引導
  - 記錄用戶選擇（不重複提示）

#### 技術實現
```typescript
// src/lib/pwa/service-worker-registration.ts
// src/app/components/pwa-install-prompt.tsx
// public/sw.js (Service Worker)
```

---

### 5.1.2 響應式設計改進 📱
**目標**: 所有功能在手機上完美運作

#### 優化區域
- [ ] **上傳區域** ([upload-zone.tsx](src/components/upload-zone.tsx))
  - 手機版簡化 UI（大按鈕）
  - 拖放在移動端改為點擊選擇
  - 相機直接拍照選項
  - 預覽網格改為單列滑動

- [ ] **筆記編輯器** ([split-editor.tsx](src/components/split-editor.tsx))
  - 手機版改為上下分割（非左右）
  - 全屏編輯模式
  - 底部固定操作欄
  - 手勢控制（滑動切換預覽/編輯）

- [ ] **側邊欄** (AppSidebar)
  - 改為 Sheet 彈出（非固定）
  - 底部導航欄（Home, Notes, Search, Settings）
  - 減少視覺干擾

- [ ] **搜尋介面** ([advanced-search-client.tsx](src/components/advanced-search-client.tsx))
  - 篩選器改為底部抽屜
  - 標籤改為橫向滑動
  - 結果卡片加大觸控熱區

#### 技術實現
```typescript
// Tailwind breakpoints: sm, md, lg, xl
// Use: className="flex-col md:flex-row"
// Mobile-first approach
```

---

### 5.1.3 相機直接拍照 📸
**目標**: 手機上直接拍照上傳，無需先存檔案

#### 實施內容
- [ ] **相機 API 集成**
  ```typescript
  // src/components/camera-capture.tsx
  const { stream } = await navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: 'environment' } 
  })
  ```

- [ ] **拍照介面**
  - 全屏相機預覽
  - 閃光燈切換
  - 前後鏡頭切換
  - 拍照後即時預覽與確認

- [ ] **圖片預處理**
  - 自動裁切文件邊緣
  - 增強對比度（提升 OCR 準確度）
  - 壓縮大小（降低上傳時間）

#### 技術實現
```typescript
// src/lib/image-processing.ts (Canvas API)
// 使用 sharp 或 browser-image-compression
```

---

## 🧠 Phase 5.2: 進階 AI 功能 (Option D)

### 5.2.1 智能筆記關聯分析 🔗
**目標**: 自動發現筆記之間的關聯，提供智能推薦

#### 實施內容
- [ ] **內容向量化**
  - 使用 Gemini Embeddings API
  - 為每個筆記生成 768 維向量
  - 存儲到資料庫（新欄位 `embedding`）

- [ ] **相似度計算**
  - 餘弦相似度演算法
  - 批量計算（避免 N² 複雜度）
  - 快取關聯結果

- [ ] **推薦系統**
  - 「相關筆記」側邊欄
  - 「你可能感興趣」區塊
  - 基於標籤 + 內容的混合推薦

#### Prisma Schema 更新
```prisma
model Note {
  // ... 現有欄位
  embedding    String?  // JSON 格式的向量
  
  // 雙向關聯
  relatedFrom  NoteRelation[] @relation("FromNote")
  relatedTo    NoteRelation[] @relation("ToNote")
}

model NoteRelation {
  id           String   @id @default(cuid())
  fromNoteId   String
  toNoteId     String
  similarity   Float    // 0.0 - 1.0
  relationType String   // "similar_content", "related_topic", "reference"
  
  fromNote     Note     @relation("FromNote", fields: [fromNoteId], references: [id], onDelete: Cascade)
  toNote       Note     @relation("ToNote", fields: [toNoteId], references: [id], onDelete: Cascade)
  
  createdAt    DateTime @default(now())
  
  @@unique([fromNoteId, toNoteId])
  @@index([fromNoteId])
  @@index([toNoteId])
}
```

#### API 端點
```typescript
// GET /api/notes/[id]/related - 獲取相關筆記
// POST /api/notes/analyze-relations - 批量分析關聯
```

---

### 5.2.2 知識圖譜可視化 🕸️
**目標**: 視覺化筆記之間的關聯網絡

#### 實施內容
- [ ] **圖形可視化庫**
  - 使用 `react-force-graph` 或 `cytoscape.js`
  - 節點 = 筆記
  - 邊 = 關聯強度

- [ ] **互動功能**
  - 點擊節點查看筆記
  - 拖曳節點重新排列
  - 篩選顯示（按標籤、日期）
  - 縮放與平移

- [ ] **圖譜分析**
  - 中心節點識別（核心概念）
  - 孤立節點提示（未關聯筆記）
  - 簇群偵測（主題群組）

#### 組件實現
```typescript
// src/components/knowledge-graph.tsx
// src/app/graph/page.tsx (新頁面)
```

---

### 5.2.3 智能問答系統 💬
**目標**: 用自然語言查詢筆記內容

#### 實施內容
- [ ] **語義搜尋增強**
  - 將用戶問題轉換為向量
  - 與筆記向量比對
  - 返回最相關的 Top-K 筆記

- [ ] **上下文問答**
  - 將相關筆記內容餵給 Gemini
  - 生成基於實際內容的答案
  - 引用來源筆記

- [ ] **對話歷史**
  - 記錄問答對話
  - 支援追問（多輪對話）
  - 上下文延續

#### API 端點
```typescript
// POST /api/ai/qa - 智能問答
// 請求: { question, contextNoteIds?, conversationId? }
// 回應: { answer, sources[], suggestedFollowUp[] }
```

---

## ⚡ Phase 5.3: 性能與擴展 (Option C)

### 5.3.1 PostgreSQL 遷移 🐘
**目標**: 從 SQLite 升級到 PostgreSQL，支援大規模數據

#### 實施內容
- [ ] **Schema 調整**
  - 全文搜尋索引（`tsvector`）
  - 向量搜尋擴展（`pgvector`）
  - 分區表（按日期分區）

- [ ] **連接池**
  - Prisma 連接池配置
  - 讀寫分離預備
  - 連接數監控

- [ ] **遷移腳本**
  ```bash
  # scripts/migrate-to-postgres.ts
  # 1. 匯出 SQLite 數據
  # 2. 轉換格式
  # 3. 匯入 PostgreSQL
  # 4. 驗證數據完整性
  ```

#### Prisma 配置
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // 連接池設定
  connectionLimit = 20
  poolTimeout     = 60
}

// 全文搜尋索引
@@index([refinedContent], type: GIN, name: "idx_content_search")
```

---

### 5.3.2 圖片優化與 CDN 🖼️
**目標**: 快速載入圖片，降低伺服器負擔

#### 實施內容
- [ ] **上傳時壓縮**
  - Sharp 壓縮 (質量 85%)
  - WebP 格式轉換
  - 多尺寸生成（縮圖、中圖、原圖）

- [ ] **CDN 集成**
  - Cloudflare R2 / AWS S3
  - 自動上傳到雲端儲存
  - 資料庫只存 URL

- [ ] **懶加載**
  - Intersection Observer
  - 模糊預覽（LQIP）
  - 漸進式載入

#### 實施
```typescript
// src/lib/image-optimizer.ts
import sharp from 'sharp'

export async function optimizeImage(buffer: Buffer) {
  const webp = await sharp(buffer)
    .resize(1920, null, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()
  
  const thumbnail = await sharp(buffer)
    .resize(400, 400, { fit: 'cover' })
    .webp({ quality: 70 })
    .toBuffer()
  
  return { webp, thumbnail }
}
```

---

### 5.3.3 快取機制 ⚡
**目標**: 減少重複計算，提升響應速度

#### 實施內容
- [ ] **Redis 集成**
  - 筆記列表快取（5 分鐘）
  - 搜尋結果快取（10 分鐘）
  - 向量計算結果快取（1 小時）

- [ ] **Client-side 快取**
  - React Query / SWR
  - 樂觀更新
  - 背景重新驗證

- [ ] **靜態生成**
  - ISR (Incremental Static Regeneration)
  - 常見頁面預渲染
  - 降低伺服器負載

#### 實施
```typescript
// src/lib/redis.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
})

// 快取包裝器
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300 // 5 分鐘
): Promise<T> {
  const cached = await redis.get<T>(key)
  if (cached) return cached
  
  const fresh = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(fresh))
  return fresh
}
```

---

## 📅 實施時間表

### Week 1: 移動端 + AI 基礎 (4 天)
- **Day 1**: PWA 設定 + Service Worker
- **Day 2**: 響應式優化（上傳、編輯器、導航）
- **Day 3**: 相機拍照功能
- **Day 4**: 向量化 + 關聯分析

### Week 2: AI 進階 + 性能 (4 天)
- **Day 5**: 知識圖譜可視化
- **Day 6**: 智能問答系統
- **Day 7**: PostgreSQL 遷移 + 圖片優化
- **Day 8**: Redis 快取 + 測試部署

---

## 🎯 成功指標

### 性能指標
- 首次載入 < 2 秒
- 圖片載入 < 500ms
- API 響應 < 200ms
- Lighthouse 評分 > 95

### 功能指標
- PWA 安裝率 > 30%
- 移動端使用比例 > 40%
- 筆記關聯準確率 > 80%
- 問答相關度 > 85%

### 擴展指標
- 支援 10,000+ 筆記
- 並發用戶 > 100
- 資料庫查詢 < 50ms

---

## 🛠️ 技術選型

### 移動端
- PWA: Workbox (Service Worker)
- 響應式: Tailwind CSS
- 相機: MediaStream API
- 圖片壓縮: browser-image-compression

### AI
- 向量化: Gemini Embeddings API
- 圖形: react-force-graph-2d
- 向量搜尋: 自建或 pgvector

### 性能
- 資料庫: PostgreSQL (Supabase/Neon)
- 快取: Upstash Redis
- CDN: Cloudflare R2
- 圖片: Sharp

---

## 📦 依賴安裝

```bash
# PWA
npm install workbox-webpack-plugin workbox-window

# 圖片處理
npm install sharp browser-image-compression

# 圖形可視化
npm install react-force-graph-2d d3

# PostgreSQL
npm install pg @prisma/client@latest

# Redis
npm install @upstash/redis

# React Query
npm install @tanstack/react-query
```

---

## ✅ 驗收標準

### Phase 5.1 (移動端)
- [ ] 可從手機桌面啟動
- [ ] 離線瀏覽已緩存筆記
- [ ] 所有功能手機可用
- [ ] 相機直接拍照上傳

### Phase 5.2 (AI)
- [ ] 每個筆記顯示相關推薦
- [ ] 知識圖譜正確渲染
- [ ] 問答準確引用來源

### Phase 5.3 (性能)
- [ ] 支援 10,000+ 筆記
- [ ] 圖片載入速度提升 3x
- [ ] API 響應時間降低 50%

---

**預計完成日期**: 2026-02-07  
**當前狀態**: 規劃完成，開始實施 🚀
