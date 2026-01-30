# 搜尋功能文件

## 功能列表

### 1. 進階搜尋表單 (`AdvancedSearchClient`)
- **關鍵詞搜尋**: 在筆記內容、摘要、標籤中搜尋
- **日期範圍篩選**: 按建立日期範圍篩選 (dateFrom, dateTo)
- **信心分數篩選**: 按 AI 辨識信心分數篩選 (confidenceMin, confidenceMax: 0.0-1.0)
- **狀態篩選**: 按處理狀態篩選 (COMPLETED, PROCESSING, FAILED)
- **標籤篩選**: 按標籤篩選 (多標籤逗號分隔)

### 2. 搜尋 API 端點 (`/api/search`)
```
GET /api/search?query=test&dateFrom=2025-01-01&status=COMPLETED&confidenceMin=0.7
```

#### 支援的查詢參數：
- `query`: 關鍵詞搜尋字串（可選）
- `dateFrom`: 開始日期 (YYYY-MM-DD)
- `dateTo`: 結束日期 (YYYY-MM-DD)
- `confidenceMin`: 最低信心分數 (0.0-1.0)
- `confidenceMax`: 最高信心分數 (0.0-1.0)
- `status`: 筆記狀態 (COMPLETED|PROCESSING|FAILED)
- `tags`: 標籤篩選 (逗號分隔)

#### 回應格式：
```json
[
  {
    "id": "uuid",
    "imageUrl": "/uploads/...",
    "refinedContent": "...",
    "summary": "...",
    "tags": "tag1,tag2",
    "status": "COMPLETED",
    "confidence": 0.95,
    "createdAt": "2025-02-10T10:30:00Z"
  }
]
```

#### 限制：
- 最大返回 100 結果
- 按 createdAt 降序排列
- 支持複雜的 WHERE 子句組合 (AND/OR)

### 3. 搜尋結果顯示
- **卡片網格**: 響應式佈局 (1 列/md:2 列/lg:3 列)
- **預覽圖像**: 縮圖預覽，支持懸停效果
- **元數據顯示**: 
  - 摘要/標題
  - 信心分數百分比
  - 處理狀態徽章
  - 關聯標籤
- **關鍵詞高亮**: 搜尋詞在摘要中以黃色高亮顯示
- **批量選擇**: 支持複選框進行批量操作

### 4. 用戶體驗
- **即時搜尋反饋**: 搜尋時顯示加載狀態
- **空結果頁面**: 友好的空結果提示
- **表單驗證**: 至少需要一個搜尋條件
- **快捷搜尋**: 支持 Enter 鍵提交
- **清除篩選**: 一鍵重置所有篩選條件

## 使用示例

### 基本搜尋
```typescript
const response = await fetch('/api/search?query=重要會議');
const results = await response.json();
```

### 進階篩選
```typescript
// 搜尋 2025 年 1-6 月完成的高質量筆記
const params = new URLSearchParams({
  query: '會議',
  dateFrom: '2025-01-01',
  dateTo: '2025-06-30',
  status: 'COMPLETED',
  confidenceMin: '0.8'
});
const response = await fetch(`/api/search?${params}`);
```

### 標籤搜尋
```typescript
// 搜尋帶有 "重要" 或 "工作" 標籤的筆記
const response = await fetch('/api/search?tags=重要,工作');
```

## 實現細節

### 後端邏輯 (`src/app/api/search/route.ts`)
1. 解析查詢參數
2. 構建 Prisma WHERE 子句：
   - 關鍵詞: 在 refinedContent 或 summary 中搜尋
   - 日期: 檢查 createdAt 在範圍內
   - 信心分數: 檢查 confidence 在範圍內
   - 狀態: 精確匹配
   - 標籤: 檢查 tags 字串包含
3. 執行查詢，返回最多 100 結果
4. 按 createdAt 降序排列

### 前端邏輯 (`src/components/advanced-search-client.tsx`)
1. 狀態管理：
   - query, dateFrom, dateTo
   - confidenceMin/Max
   - status, showFilters
   - results, isPending
2. 事件處理：
   - handleSearch: 構建查詢字符串，調用 API
   - handleReset: 清除所有狀態
3. 結果渲染：
   - 高亮關鍵詞
   - 顯示元數據
   - 卡片點擊導向詳情頁

## 測試

### 單元測試
```bash
npm run test:search
```

測試項目：
- ✓ 關鍵詞搜尋
- ✓ 日期範圍篩選
- ✓ 信心分數篩選
- ✓ 狀態篩選
- ✓ 複合篩選
- ✓ 結果格式驗證
- ✓ 最大結果數限制
- ✓ 排序順序

### E2E 測試 (Playwright/Cypress)
見 `__tests__/search.e2e.ts`

測試覆蓋：
- 表單 UI 與互動
- 搜尋提交與驗證
- 結果顯示與格式
- 關鍵詞高亮
- 響應式設計
- 無障礙支持

## 後續改進

### Phase 2
- [ ] 搜尋建議 (autocomplete)
- [ ] 搜尋歷史
- [ ] 保存搜尋預設
- [ ] 全文搜尋索引 (Prisma/PostgreSQL)

### Phase 3
- [ ] 實時搜尋 (WebSocket)
- [ ] AI 驅動的語意搜尋
- [ ] 搜尋分析與統計
- [ ] 高級布爾搜尋語法

## API 速率限制
目前無 API 速率限制。建議在生產環境添加：
- 每用戶 100 搜尋/分鐘
- 每用戶 10 複雜查詢/分鐘

## 性能考量
- SQLite 全表掃描可能對大型數據集變慢
- 建議添加全文搜尋索引或升級至 PostgreSQL
- 實現分頁或無限滾動處理大結果集
