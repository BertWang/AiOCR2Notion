# AI 助手功能診斷和改進計劃

## 問題分析

### 🔴 當前識別的問題

1. **可能的卡死場景**
   - 長時間等待 API 回應
   - 大量對話訊息導致 UI 延遲
   - 建議生成超時
   - Gemini API 速率限制

2. **UI/UX 缺陷**
   - 缺少超時提示
   - 長時間載入無進度反饋
   - 訊息重複的風險
   - 滾動可能卡頓（消息量大時）

3. **功能問題**
   - 沒有重試機制
   - 沒有錯誤恢復
   - 沒有請求取消
   - 沒有速率限制提示

---

## 改進計劃

### Phase 1: 添加錯誤邊界和超時控制

#### 1.1 更新 AI Chat 路由 (`src/app/api/notes/[id]/ai-chat/route.ts`)

```typescript
// 添加超時控制 (60 秒)
const TIMEOUT_MS = 60000;

// 添加重試邏輯和速率限制檢查
const handleTimeout = (controller: AbortController) => {
  setTimeout(() => controller.abort(), TIMEOUT_MS);
};
```

**修改清單:**
- [ ] 添加 AbortController 支持
- [ ] 添加 60 秒超時
- [ ] 添加 429 (速率限制) 響應處理
- [ ] 改善錯誤訊息

#### 1.2 更新 AI 建議路由 (`src/app/api/notes/[id]/ai-suggestions/route.ts`)

**修改清單:**
- [ ] 添加超時控制
- [ ] 添加速率限制檢查
- [ ] 改善錯誤恢復

---

### Phase 2: 前端 UI 改進

#### 2.1 增強載入狀態 (`src/components/note-ai-assistant.tsx`)

**改進項目:**

1. **細粒度載入狀態**
   ```typescript
   const [isLoadingChat, setIsLoadingChat] = useState(false);
   const [loadingProgress, setLoadingProgress] = useState(0);  // 新增
   const [loadingError, setLoadingError] = useState<string | null>(null);  // 新增
   const [isTimeoutWarning, setIsTimeoutWarning] = useState(false);  // 新增
   ```

2. **超時倒計時**
   ```typescript
   useEffect(() => {
     if (isLoadingChat) {
       const timeout = setTimeout(() => {
         setIsTimeoutWarning(true);
       }, 45000); // 45 秒後警告
       return () => clearTimeout(timeout);
     }
   }, [isLoadingChat]);
   ```

3. **請求中止控制**
   ```typescript
   const abortControllerRef = useRef<AbortController | null>(null);
   
   const handleCancelMessage = () => {
     abortControllerRef.current?.abort();
     setIsLoadingChat(false);
   };
   ```

**修改清單:**
- [ ] 添加加載進度條 (45秒時顯示警告)
- [ ] 添加取消按鈕
- [ ] 改善錯誤顯示
- [ ] 添加重試機制

#### 2.2 優化訊息滾動

```typescript
// 改進滾動邏輯，避免頻繁重排
useEffect(() => {
  if (scrollRef.current && messages.length > 0) {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }
}, [messages]);
```

**修改清單:**
- [ ] 使用 requestAnimationFrame 優化
- [ ] 虛擬化長列表（100+ 訊息時）
- [ ] 減少重新渲染

---

### Phase 3: 功能增強

#### 3.1 對話管理
- [ ] 清除對話歷史功能
- [ ] 導出對話記錄 (Markdown)
- [ ] 搜尋對話內容
- [ ] 標記重要訊息

#### 3.2 建議管理
- [ ] 應用建議到筆記
- [ ] 建議歷史記錄
- [ ] 建議採納率分析

#### 3.3 智能功能
- [ ] 快捷問題範本
- [ ] 記憶對話風格
- [ ] 上下文感知回應

---

## 實施步驟

### 優先級順序

1. **緊急修復** (Phase 1)
   - 添加超時控制 → 防止卡死
   - 添加錯誤恢復 → 改善穩定性
   - 添加用戶反饋 → 明確狀態

2. **必要改進** (Phase 2)
   - 增強 UI 反饋 → 改善體驗
   - 優化性能 → 流暢交互
   - 添加控制 → 用戶掌控度

3. **未來功能** (Phase 3)
   - 對話管理 → 長期使用
   - 建議應用 → 實用性
   - 智能功能 → 差異化

---

## 技術詳情

### 後端改進 (API 路由)

#### 添加超時和速率限制
```typescript
// 在 ai-chat/route.ts 中
const TIMEOUT_MS = 60000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// 實現指數退避
function getRetryDelay(attempt: number) {
  return RETRY_DELAY_MS * Math.pow(2, attempt);
}

// 使用 AbortSignal
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
```

#### 改善錯誤響應
```typescript
// 區分不同錯誤類型
if (error.code === 'ABORT_ERR') {
  return NextResponse.json(
    { error: "Request timeout", code: "TIMEOUT" },
    { status: 408 }
  );
}

if (response.status === 429) {
  return NextResponse.json(
    { 
      error: "Rate limit exceeded", 
      code: "RATE_LIMIT",
      retryAfter: response.headers.get('Retry-After')
    },
    { status: 429 }
  );
}
```

### 前端改進 (React 組件)

#### 添加進度反饋
```tsx
{isTimeoutWarning && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
    <AlertCircle className="w-4 h-4 inline mr-2" />
    AI 回應較慢，您可以
    <button 
      onClick={handleCancelMessage}
      className="underline font-medium ml-2"
    >
      取消請求
    </button>
  </div>
)}

{isLoadingChat && (
  <div className="p-3 bg-blue-50 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>AI 正在思考中...</span>
    </div>
    <Progress value={loadingProgress} className="h-1" />
    <div className="text-xs text-stone-500 mt-2">
      {loadingProgress}% 完成 · 已等待 {Math.floor(loadingTime / 1000)} 秒
    </div>
  </div>
)}
```

#### 改進訊息列表性能
```tsx
// 對長列表使用虛擬化
import { FixedSizeList as List } from 'react-window';

const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
  <div style={style}>
    {/* 訊息組件 */}
  </div>
);

{messages.length > 100 && (
  <List
    height={400}
    itemCount={messages.length}
    itemSize={80}
  >
    {Row}
  </List>
)}
```

---

## 測試計劃

### Unit Tests
- [ ] 超時邏輯測試
- [ ] 重試機制測試
- [ ] 錯誤處理測試
- [ ] 訊息排序測試

### Integration Tests
- [ ] 完整對話流程
- [ ] 建議生成流程
- [ ] 錯誤恢復流程

### E2E Tests
- [ ] 長時間運行測試 (1小時+)
- [ ] 高負載測試 (100+ 訊息)
- [ ] 網路中斷模擬
- [ ] 速率限制模擬

### 性能測試
- [ ] 首次加載時間
- [ ] 訊息渲染性能
- [ ] 內存使用情況
- [ ] 聊天歷史加載

---

## 配置和環境

### 環境變數
```env
# AI 模型配置
GEMINI_API_KEY=sk-...
GEMINI_MODEL=gemini-2.0-flash

# 超時配置
CHAT_TIMEOUT_MS=60000
SUGGESTIONS_TIMEOUT_MS=30000

# 速率限制
AI_REQUESTS_PER_MINUTE=30
AI_BURST_SIZE=5
```

### 特性開關 (Feature Flags)
```typescript
const FEATURES = {
  enableTimeout: true,
  enableRetry: true,
  enableProgressBar: true,
  enableVirtualization: false,  // 待實現
  enableVoiceChat: false,       // 未來功能
};
```

---

## 預期改進

### 穩定性
- ❌ 現在: 卡死風險高
- ✅ 目標: 完整的超時和錯誤恢復

### 用戶體驗
- ❌ 現在: 不清楚加載狀態
- ✅ 目標: 明確的進度反饋和控制

### 性能
- ❌ 現在: 大量訊息時卡頓
- ✅ 目標: 流暢的 100+ 訊息交互

### 功能
- ❌ 現在: 基礎對話
- ✅ 目標: 完整的對話管理和應用

---

## 參考文檔

### 相關檔案
- [src/components/note-ai-assistant.tsx](../src/components/note-ai-assistant.tsx) - 前端組件
- [src/app/api/notes/[id]/ai-chat/route.ts](../src/app/api/notes/[id]/ai-chat/route.ts) - 聊天 API
- [src/app/api/notes/[id]/ai-suggestions/route.ts](../src/app/api/notes/[id]/ai-suggestions/route.ts) - 建議 API
- [src/components/chat-toolbar.tsx](../src/components/chat-toolbar.tsx) - 工具欄

### 第三方庫
- [react-window](https://github.com/bvaughn/react-window) - 虛擬化列表
- [@google/generative-ai](https://github.com/google/generative-ai-js) - Gemini API
- [sonner](https://sonner.emilkowal.ski/) - Toast 通知
- [react-markdown](https://github.com/remarkjs/react-markdown) - Markdown 渲染

---

## 成功指標

### 功能指標
- [ ] 零超時錯誤 (24 小時測試)
- [ ] 100% 錯誤恢復率
- [ ] <5 秒平均回應時間

### 用戶體驗指標
- [ ] <2 秒首次加載
- [ ] 100+ 訊息無延遲
- [ ] 85% 用戶滿意度

### 可靠性指標
- [ ] 99.5% 正常運行時間
- [ ] <0.1% 訊息丟失率
- [ ] 100% 數據持久化

---

**狀態**: 📋 規劃完成 | 🎯 準備實施
**優先級**: 🔴 高 (影響用戶體驗)
**預計工作量**: 8-12 小時
**建議分配**: Phase 1 (4h) → Phase 2 (4h) → Phase 3 (4h)
