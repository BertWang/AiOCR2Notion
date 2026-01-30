# Clawdbot 開發任務清單

**優先級序列**: Phase 2.1 → 2.2 → 2.3 → Phase 3 → Phase 4

---

## 🎯 Phase 2.1: 搜尋建議 UI 實現

**優先級**: 🔴 立即  
**時間估計**: 3-4 小時  
**分支名稱**: `feature/search-suggestions-ui`

### 📋 任務描述

完成搜尋建議功能的前端實現，包括自動完成下拉菜單、API 整合和用戶交互。

### 功能需求

#### 1. SearchSuggestions 組件（新建）
**文件**: `src/components/search-suggestions.tsx`

```typescript
// 建議數據結構
interface Suggestion {
  type: 'note' | 'tag' | 'quick-search';
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

// 組件 Props
interface SearchSuggestionsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  isOpen: boolean;
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onHighlight: (index: number) => void;
}
```

**功能**:
- ✅ 顯示建議下拉菜單（分組按類型）
- ✅ 支持鍵盤導航（↑↓ Enter Escape）
- ✅ 點擊或 Enter 選擇建議
- ✅ 高亮當前選中項
- ✅ 加載和空狀態處理
- ✅ Framer Motion 動畫

#### 2. SearchBar 組件更新
**文件**: `src/components/search-bar.tsx`

**需要更新**:
```typescript
// 新增狀態
const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [selectedIndex, setSelectedIndex] = useState(-1);
const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

// 當輸入改變時
const handleInputChange = useCallback(debounce(async (value: string) => {
  if (value.length < 2) {
    setShowSuggestions(false);
    return;
  }
  
  setIsLoadingSuggestions(true);
  try {
    const res = await fetch(`/api/search/suggestions?query=${value}`);
    const data = await res.json();
    setSuggestions(data.suggestions || []);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  } catch (error) {
    console.error("Failed to fetch suggestions", error);
  } finally {
    setIsLoadingSuggestions(false);
  }
}, 300), []);

// 鍵盤導航
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (!showSuggestions || suggestions.length === 0) return;
  
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      setSelectedIndex(prev => prev <= 0 ? suggestions.length - 1 : prev - 1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      setSelectedIndex(prev => prev >= suggestions.length - 1 ? 0 : prev + 1);
      break;
    case 'Enter':
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
      break;
    case 'Escape':
      setShowSuggestions(false);
      break;
  }
}, [showSuggestions, suggestions, selectedIndex]);

// 選擇建議
const handleSelectSuggestion = (suggestion: Suggestion) => {
  switch (suggestion.type) {
    case 'tag':
      setSearchQuery(`tag:${suggestion.title}`);
      break;
    case 'quick-search':
      setSearchQuery(suggestion.title);
      break;
    case 'note':
    default:
      setSearchQuery(suggestion.title);
  }
  setShowSuggestions(false);
  // 觸發搜尋
  handleSearch();
};
```

#### 3. 樣式和設計

**Z-Index 管理**:
- Input: 10
- Suggestions Dropdown: 50
- 確保不被其他模態窗口覆蓋

**響應式設計**:
- 桌面：固定寬度，最多顯示 5 個建議
- 平板：全寬，捲軸
- 移動：全寬，最多 3 個可見

**動畫**:
```typescript
// 進入
initial={{ opacity: 0, y: -10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -10 }}
transition={{ duration: 0.15 }}

// 項目懸停
whileHover={{ backgroundColor: "rgba(var(--stone-100))" }}
```

### API 整合

**使用端點**: `GET /api/search/suggestions?query={query}`

**響應格式**:
```json
{
  "success": true,
  "suggestions": [
    {
      "type": "note",
      "id": "note-123",
      "title": "機器學習入門",
      "subtitle": "已於 2025-01-28 編輯"
    },
    {
      "type": "tag",
      "id": "tag-ai",
      "title": "人工智能"
    },
    {
      "type": "quick-search",
      "id": "qs-1",
      "title": "本月工作筆記"
    }
  ]
}
```

### ✅ 驗收標準

**功能**:
- [ ] SearchSuggestions 組件完成並導出
- [ ] SearchBar 正確集成建議下拉菜單
- [ ] 鍵盤導航（↑↓ Enter Escape）正常工作
- [ ] 防抖工作正常（300ms）
- [ ] 3 種建議類型都正確顯示
- [ ] 選擇建議後正確執行搜尋

**品質**:
- [ ] 無 TypeScript 錯誤（strict mode）
- [ ] ESLint 檢查通過
- [ ] 無 React 警告

**設計**:
- [ ] 符合 Digital Zen 設計系統
- [ ] 樣式一致性（顏色、字體、間距）
- [ ] 懸停/焦點狀態清晰
- [ ] 移動端響應式測試

**測試**:
- [ ] 空搜尋結果處理
- [ ] 輸入 < 2 字符不顯示建議
- [ ] 加載狀態顯示
- [ ] 錯誤狀態處理
- [ ] 建議菜單外點擊關閉

### 🔗 依賴

- ✅ `/api/search/suggestions` 已實現
- ✅ Framer Motion 已安裝
- ✅ Prisma schema 已準備
- ✅ shadcn/ui 已配置

### 📚 參考文件

- `src/components/search-bar.tsx` - 現有實現
- `src/app/api/search/suggestions/route.ts` - API 端點
- `AI_MODULE_MCP_CONFIGURATION.md` - 系統文檔

---

## 🎯 Phase 2.2: 搜尋歷史 UI 實現

**優先級**: 🟡 第二  
**時間估計**: 2-3 小時  
**依賴**: Phase 2.1 完成  
**分支名稱**: `feature/search-history-ui`

### 功能需求

#### 1. SearchHistoryDropdown 組件
**文件**: `src/components/search-history-dropdown.tsx`

- 顯示最近 10 條搜尋歷史
- 按時間排序（最新優先）
- 一鍵重複搜尋
- 清除單條或全部歷史
- 搜尋欄旁邊的時鐘圖標打開

#### 2. 搜尋欄集成

- 添加歷史記錄按鈕（時鐘圖標）
- 點擊打開/關閉歷史下拉菜單
- 每次搜尋自動保存到歷史
- 防止重複記錄（同一查詢 5 分鐘內）

### 驗收標準

- [ ] 組件完成並集成
- [ ] API 調用正常（GET /api/search/history）
- [ ] 歷史記錄自動保存
- [ ] 清除功能正常
- [ ] 重複搜尋正常工作
- [ ] 移動端友好

---

## 🎯 Phase 2.3: 保存搜尋 UI 實現

**優先級**: 🟡 第二  
**時間估計**: 2-3 小時  
**依賴**: Phase 2.1、2.2 完成  
**分支名稱**: `feature/saved-searches-ui`

### 功能需求

#### 1. SavedSearchesList 側面板
**文件**: `src/components/saved-searches-list.tsx`

- 顯示所有保存的搜尋
- 按名稱分組或排序
- 快速應用保存的搜尋
- 編輯和刪除保存的搜尋
- 在進階搜尋頁面右側顯示

#### 2. SaveSearchDialog 組件
**文件**: `src/components/save-search-dialog.tsx`

- 在進階搜尋頁面顯示「保存搜尋」按鈕
- 彈出對話框輸入名稱和描述
- 保存當前的搜尋條件
- 成功提示

### 驗收標準

- [ ] 組件完成
- [ ] API 調用正常（POST/PUT/DELETE /api/search/saved）
- [ ] 保存和載入功能正常
- [ ] 編輯和刪除正常
- [ ] 搜尋條件正確序列化
- [ ] 側面板響應式

---

## 🎯 Phase 3: AI 增強功能

**優先級**: 🟣 第三  
**時間估計**: 6-8 小時  
**依賴**: Phase 2 完成

### Phase 3.1: AI 建議面板
**文件**: 待創建

- 在編輯器右側添加 Sparkles 圖標
- 點擊打開 AI 建議面板
- 調用 `generateSuggestions` API
- 顯示相關推薦、待辦事項、標籤
- 一鍵應用建議

### Phase 3.2: AI 對話介面
**文件**: 待創建

- 與 AI 聊天詢問筆記內容
- 提出問題、請求總結、標籤生成
- 對話歷史記錄

### Phase 3.3: 語義搜尋（可選）
- 需要向量嵌入
- 需要相似度算法

---

## 🎯 Phase 4: 部署和優化

**優先級**: 🟣 第四  
**時間估計**: 8-10 小時

### Phase 4.1: E2E 測試
- Playwright 配置
- 關鍵流程測試

### Phase 4.2: 性能優化
- 代碼分割
- 圖片優化
- 緩存策略

### Phase 4.3: 安全加固
- CSRF 保護
- 速率限制
- 輸入驗證

### Phase 4.4: 部署配置
- Docker 配置
- CI/CD 流程

---

## 📊 進度追蹤

| 階段 | 任務 | 狀態 | 完成度 |
|------|------|------|--------|
| Phase 2.1 | 搜尋建議 UI | ⏳ 待開始 | 0% |
| Phase 2.2 | 搜尋歷史 UI | ⏳ 待開始 | 0% |
| Phase 2.3 | 保存搜尋 UI | ⏳ 待開始 | 0% |
| Phase 3.1 | AI 建議面板 | ⏳ 待開始 | 0% |
| Phase 3.2 | AI 對話 | ⏳ 待開始 | 0% |
| Phase 4.1 | E2E 測試 | ⏳ 待開始 | 0% |
| Phase 4.2 | 性能優化 | ⏳ 待開始 | 0% |
| Phase 4.3 | 安全加固 | ⏳ 待開始 | 0% |
| Phase 4.4 | 部署配置 | ⏳ 待開始 | 0% |

---

## 🚀 如何開始

### 對於 Clawdbot

1. **簽出 feature 分支**:
   ```bash
   git checkout -b feature/search-suggestions-ui
   ```

2. **創建組件**:
   - `src/components/search-suggestions.tsx`
   - 更新 `src/components/search-bar.tsx`

3. **測試**:
   ```bash
   npm run dev
   # 訪問 http://localhost:3001/notes
   ```

4. **提交並推送**:
   ```bash
   git add -A
   git commit -m "feat: SearchSuggestions 組件和 SearchBar 整合"
   git push origin feature/search-suggestions-ui
   ```

5. **開啟 PR** 到 `main`

### 對於 Copilot

- ✅ 監督進度
- ✅ 代碼審查
- ✅ 問題解決
- ✅ 決策支持

---

**最後更新**: 2025-01-30  
**下一檢查**: Phase 2.1 完成後
