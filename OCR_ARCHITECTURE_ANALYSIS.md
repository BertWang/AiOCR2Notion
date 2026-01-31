# 🏗️ OCR 提供商管理 - 架構分析

**分析日期**: 2026-01-31  
**狀態**: 決策前架構評估  

---

## 📊 當前系統狀態

### 現有 AI 提供商架構

```
AIProviderFactory (工廠模式)
├── getDefaultProvider() - 從環境變數讀取
├── createProvider(config) - 根據配置創建提供商
├── registerConfig() - 註冊新配置
└── clearCache() - 清除緩存

支持的提供商:
├── Gemini ✅ (已實現)
├── OpenAI ✅ (已實現)
├── Azure ⏳ (待實現)
├── Claude ⏳ (待實現)
└── Custom ⏳ (待實現)
```

### 當前 OCR 流程

```
上傳檔案 (upload/route.ts)
    ↓
AIProviderFactory.getDefaultProvider()
    ↓
讀取環境變數: GEMINI_API_KEY, AI_MODEL
    ↓
調用 aiProvider.processNote(filepath)
    ↓
更新 Note.ocrProvider 字段
    ↓
儲存結果到資料庫
```

### 環境變數依賴

```
.env.local 中:
- GEMINI_API_KEY      (必填)
- AI_MODEL            (預設: gemini-2.0-flash)
- AI_PROVIDER         (記錄日誌用)

缺點: 靜態配置，需重啟服務才能切換
```

---

## 🔴 系統影響分析

### 1️⃣ 直接受影響的主程式 (5 個)

#### A. `/api/upload/route.ts` (LINE 83)
```typescript
// 問題: 硬編碼使用 AIProviderFactory.getDefaultProvider()
const aiProvider = AIProviderFactory.getDefaultProvider();

// 需要改為: 根據用戶選擇動態取得
const ocrProviderPref = await getSelectedOCRProvider(); // 新方法
const aiProvider = AIProviderFactory.createProvider(ocrProviderPref);
```

**影響**: ⚠️ 核心路徑，每次上傳都會調用

#### B. `/api/retry/route.ts` (LINE ~60)
```typescript
// 同樣問題: 硬編碼 getDefaultProvider()
const aiProvider = AIProviderFactory.getDefaultProvider();

// 需要改為: 優先使用原筆記的 ocrProvider，次之使用用戶選擇
```

**影響**: ⚠️ 重試邏輯，需保持一致性

#### C. `/api/admin/ai-config/route.ts` (全頁)
```typescript
// 現有: 只管理模型配置
// 需要增加: OCR 提供商切換邏輯
```

**影響**: ⚠️ 需要擴展現有端點

#### D. `/api/admin/settings` (新增)
```typescript
// 需要創建: 保存用戶 OCR 提供商偏好設置
// 數據結構:
{
  ocrProvider: "gemini" | "azure" | "openai",
  ocrConfig: { /* 提供商特定配置 */ },
  fallbackProvider?: "gemini" // 備用方案
}
```

**影響**: 🟡 新增端點，無向後相容性問題

#### E. 批處理邏輯 (合併、批量重試)
```typescript
// /api/notes/merge/route.ts
// /api/batch-retry/route.ts (新增或擴展)

// 需要考慮: 多個提供商結果的合併邏輯
```

**影響**: 🟡 中等影響

---

### 2️⃣ 資料庫 Schema 變更

#### 當前 Note 模型 (prisma/schema.prisma)
```prisma
model Note {
  ocrProvider  String?  // 當前: 只記錄使用過的提供商
  // 問題: 沒有 "偏好設置" 字段
}

model AdminSettings {
  aiProvider   String   // 當前: 全局模型配置
  modelName    String
  config       String?
  // 缺少: OCR 提供商配置欄位
}
```

#### 需要的變更

```prisma
// 選項 A: 最小改動
model AdminSettings {
  // ... 現有欄位
  ocrProvider     String?  // 新增: 首選 OCR 提供商
  ocrConfig       String?  // 新增: OCR 配置 (JSON)
  fallbackProvider String? // 新增: 備用提供商
}

// 選項 B: 完整方案
model OCRProviderSetting {
  id               String   @id @default(cuid())
  provider         String   // gemini, azure, openai, etc.
  enabled          Boolean  @default(false)
  priority         Int      // 優先級 1-10
  apiKey           String?  // 加密存儲
  config           String?  // 提供商特定配置
  isDefault        Boolean  @default(false)
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  @@unique([provider])
  @@index([priority])
}
```

**影響**: 需要數據庫遷移

---

### 3️⃣ 缺失的 OCR 提供商實現

#### 現有
- ✅ Gemini (完整實現)
- ✅ OpenAI (基本實現)

#### 需要實現
- ⏳ Azure Computer Vision
- ⏳ Google Cloud Vision
- ⏳ Tesseract (本地)
- ⏳ AWS Textract

**每個提供商需要**:
```
- src/lib/ai-service/providers/{provider}.ts (~200 行)
- 環境變數配置
- API 密鑰管理
- 錯誤處理
- 重試邏輯
- 單元測試 (~100 行)
```

---

### 4️⃣ UI 層影響

#### 設置頁面
```
需要添加:
├── OCR 提供商選擇卡片
├── 每個提供商的配置面板
├── 測試連接按鈕
├── 優先級排序
└── 備用方案配置
```

#### 筆記編輯器
```
可選增強:
├── 顯示當前使用的 OCR 提供商
├── 用其他提供商重新分析
└── 對比不同提供商結果
```

---

## 🎯 方案對比

### 方案 A: 最小改動 (建議)

**優點**:
- ✅ 快速實施 (3-4 小時)
- ✅ 低風險，主要改造 AdminSettings
- ✅ 向後相容

**缺點**:
- ❌ 一次只能選一個主提供商
- ❌ 無法同時使用多個提供商

**實施步驟**:
1. 擴展 AdminSettings schema (10 min)
   ```prisma
   ocrProvider String? @default("gemini")
   ocrConfig String?
   ```

2. 修改 AIProviderFactory (30 min)
   ```typescript
   static getSelectedProvider(): AIProviderInterface {
     // 從 AdminSettings 讀取, 而非環境變數
   }
   ```

3. 修改 upload/route.ts (30 min)
   ```typescript
   const aiProvider = AIProviderFactory.getSelectedProvider();
   ```

4. 修改 retry/route.ts (20 min)
   ```typescript
   // 優先使用原 Note.ocrProvider, 次之使用選定提供商
   ```

5. 創建 OCR 管理 UI (2-3 hours)
   ```
   - 提供商選擇卡片
   - API 密鑰管理
   - 測試按鈕
   - 保存邏輯
   ```

6. 實現 3-4 個新提供商 (可選，後續)

**總時間**: 3-4 小時

---

### 方案 B: 完整多提供商 (進階)

**優點**:
- ✅ 支持多個提供商同時運行
- ✅ 自動容錯切換
- ✅ A/B 測試能力
- ✅ 成熟的提供商系統

**缺點**:
- ❌ 複雜度高 (5-6 小時)
- ❌ 數據庫遷移風險
- ❌ 測試範圍大

**實施步驟**:
1. 創建 OCRProviderSetting 模型 (30 min)
2. 創建 OCR 提供商管理器 (1 hour)
3. 修改上傳流程支持故障轉移 (1 hour)
4. 創建完整的管理 UI (2-3 hours)
5. 實現主要提供商 (後續)

**總時間**: 5-6 小時

---

## 🚨 風險評估

### 方案 A 的風險

| 風險項 | 等級 | 緩解方案 |
|--------|------|---------|
| 遷移 AdminSettings | 🟡 低 | 數據無損，舊配置自動遷移 |
| 上傳路徑邏輯變更 | 🔴 中 | 完整的 E2E 測試覆蓋 |
| 重試邏輯一致性 | 🟡 低 | 單元測試驗證 |
| API 密鑰洩露 | 🔴 高 | 使用加密存儲，環境變數備份 |

### 方案 B 的風險

| 風險項 | 等級 | 緩解方案 |
|--------|------|---------|
| 複雜的遷移邏輯 | 🔴 高 | 分步遷移，數據備份 |
| 故障轉移邏輯 | 🔴 高 | 廣泛的集成測試 |
| 成本控制 | 🔴 高 | 成本監控儀表板 |
| 用戶混淆 | 🟡 中 | 清晰的 UI 指引 |

---

## 📅 實施順序建議

### 立即開始 (今天)

如果選擇 **方案 A**:

```
優先級 1: 整合 Model Management UI (已完成組件)
  → 驗證模型切換功能正常

優先級 2: Schema 遷移 (30 min)
  → 擴展 AdminSettings.ocrProvider

優先級 3: 修改上傳流程 (1 hour)
  → upload/route.ts, retry/route.ts

優先級 4: OCR 管理 UI (2-3 hours)
  → 設置頁面新增 OCR 提供商面板

總時間: 4-5 小時
```

### 順序流程圖

```
START
  ├─► 1. 整合 Model Management UI ✅ (已完成)
  │     └─► 2a. 確認運行無誤
  │
  ├─► 2. OCR Schema 遷移
  │     └─► 2b. 數據庫 migration
  │
  ├─► 3. 修改核心路由
  │     ├─► 3a. upload/route.ts
  │     ├─► 3b. retry/route.ts
  │     └─► 3c. 單元測試驗證
  │
  ├─► 4. OCR 提供商 UI
  │     ├─► 4a. 提供商卡片
  │     ├─► 4b. 配置面板
  │     └─► 4c. 保存邏輯
  │
  └─► END: 系統支持 OCR 提供商切換
```

---

## ✅ 決策清單

請確認以下項目:

- [ ] 選擇方案 A (最小改動) 還是方案 B (完整多提供商)?
- [ ] 是否需要支持自動故障轉移?
- [ ] 是否需要成本監控?
- [ ] 是否需要 API 密鑰的加密存儲?
- [ ] 新提供商實現的優先級?
  - [ ] Azure Computer Vision
  - [ ] Google Cloud Vision
  - [ ] Tesseract
  - [ ] AWS Textract

---

## 📝 建議流程

**根據當前進度，推薦順序**:

```
TODAY (2026-01-31):
  ✅ 1. 整合 Model Management UI (30 min)
  ✅ 2. 運行所有測試驗證 (15 min)
  🟡 3. 決定 OCR 架構方案 (30 min)

IF 選擇方案 A:
  ✅ 4. Schema 遷移 (30 min)
  ✅ 5. 修改核心路由 (1.5 hour)
  ✅ 6. OCR 管理 UI (2-3 hours)
  ⏳ 7. 新提供商實現 (後續, 按優先級)

TOTAL: 5-7 小時完成方案 A
```

---

## 🎓 核心決策因素

### 選擇方案 A 如果:
- ✅ 時間緊張
- ✅ 單個主要提供商足夠
- ✅ 不需要 A/B 測試
- ✅ 簡單、易維護為優先

### 選擇方案 B 如果:
- ✅ 需要高可用性
- ✅ 多個提供商同時運行
- ✅ 自動故障轉移
- ✅ 成本優化 (選擇最便宜的)

---

**下一步**: 請確認要采用的方案 (A 或 B)，然後開始實施！

