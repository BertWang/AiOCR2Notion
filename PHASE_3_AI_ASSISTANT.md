# Phase 3 - AI 助手互動功能

## 概述
實現筆記編輯器中的 AI 互動功能，包括智能建議生成和聊天介面。

---

## 🎯 功能規劃

### 3.1 智能建議生成 (智能建議)
**目標**: 基於筆記內容，AI 生成 3-5 條改進建議

**流程**:
1. 用戶點擊 "AI 助手" → Sparkles 按鈕
2. 前端調用 `POST /api/notes/[id]/ai-suggestions`
3. API 使用 Gemini 分析筆記內容
4. 返回結構化建議 (title + description)
5. UI 展示建議列表，支持一鍵應用

**API 端點**: 
```
POST /api/notes/[id]/ai-suggestions
Body: { noteId: string, content: string }
Response: { suggestions: Suggestion[] }
```

**Suggestion 結構**:
```typescript
interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: 'organization' | 'clarity' | 'completeness' | 'format';
  priority: 'high' | 'medium' | 'low';
  applyAction?: (content: string) => string; // 可選的一鍵應用
}
```

---

### 3.2 AI 對話介面 (與 AI 對話)
**目標**: 實現聊天式的筆記問答互動

**流程**:
1. 用戶輸入問題 (e.g., "總結這份筆記的要點")
2. 系統發送到 `POST /api/notes/[id]/ai-chat`
3. Gemini 基於筆記內容回答
4. UI 展示對話歷史

**API 端點**:
```
POST /api/notes/[id]/ai-chat
Body: { 
  message: string;
  noteId: string;
  context: string; // 筆記內容
}
Response: { response: string; }
```

**預定義快速問題模板**:
- "摘要這份筆記的主要內容"
- "找出這份筆記中的關鍵詞"
- "提供改進此筆記的建議"
- "用不同方式重新組織內容"
- "檢查語法和拼寫錯誤"

---

### 3.3 聊天歷史管理
**儲存**: Prisma 中新增 `ChatMessage` model
```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  noteId    String
  note      Note     @relation(fields: [noteId], references: [id])
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now())
}
```

**功能**:
- ✅ 保存對話歷史
- ✅ 按筆記查詢
- ✅ 清除對話歷史
- ✅ 導出對話

---

## 📦 技術實現

### 前端組件

#### 1. NoteAIAssistant.tsx (新建)
```typescript
- Props: { noteId: string; content: string; }
- State: suggestions[], chatMessages[], isLoading, selectedTab
- Features:
  ├─ Suggestions 標籤
  │  ├─ 加載狀態
  │  ├─ 建議列表 + 應用按鈕
  │  └─ 重新生成按鈕
  └─ Chat 標籤
     ├─ 聊天歷史
     ├─ 輸入框 + 提交
     ├─ 快速問題按鈕
     └─ 清除歷史
```

#### 2. 整合到 split-editor.tsx
- 替換現有的靜態 AI 助手面板
- 傳遞 noteId 和 content props
- 連接儲存和重新分析的事件

### 後端 API

#### 1. `/api/notes/[id]/ai-suggestions`
```typescript
// 使用 Gemini 的 generateSuggestions 方法
// 參考: lib/gemini.ts 中已實現的方法
// 需要: 增強提示詞，確保返回 JSON 格式
```

#### 2. `/api/notes/[id]/ai-chat`
```typescript
// 流式聊天端點
// 支持對話上下文
// 集成聊天歷史儲存
```

#### 3. `/api/notes/[id]/chat-history`
```typescript
// GET: 獲取聊天歷史
// DELETE: 清除歷史
```

---

## 🗓️ 實現清單

### Phase 3.1: 智能建議 (第 1 週)
- [ ] 建立 NoteAIAssistant.tsx 組件框架
- [ ] 實現 `getSuggestions()` API
- [ ] 建議 UI 展示
- [ ] 建議應用邏輯
- [ ] 加載和錯誤處理

### Phase 3.2: AI 對話 (第 2 週)
- [ ] 聊天 UI 組件
- [ ] `POST /api/notes/[id]/ai-chat` 實現
- [ ] ChatMessage model 遷移
- [ ] 聊天歷史儲存
- [ ] 聊天歷史查詢 API

### Phase 3.3: 增強功能 (第 3 週)
- [ ] 快速問題模板
- [ ] 聊天歷史管理
- [ ] 對話導出
- [ ] 流式回應 (選擇性)
- [ ] Gemini 優化提示詞

---

## 💾 Prompt 工程

### 智能建議提示詞
```
請分析以下筆記內容，提供 3-5 條改進建議。
每條建議應包含:
- title: 簡短標題 (5-10 字)
- description: 詳細描述 (20-50 字)
- category: 'organization'|'clarity'|'completeness'|'format'
- priority: 'high'|'medium'|'low'

返回 JSON 陣列格式。
```

### 聊天基礎提示詞
```
您是一個幫助用戶改進筆記的 AI 助手。
根據以下筆記內容回答用戶問題。
保持回答簡潔、有用、繁體中文。

筆記內容:
{noteContent}

用戶問題:
{userQuestion}
```

---

## 🔗 依賴關係

| 組件 | 依賴 | 狀態 |
|------|------|------|
| NoteAIAssistant | Gemini API ✅ | 就緒 |
| AI Suggestions | /api/notes/[id]/ai-suggestions | 待建 |
| AI Chat | /api/notes/[id]/ai-chat | 待建 |
| Chat History | Prisma ChatMessage | 待建 |
| split-editor | NoteAIAssistant | 待整合 |

---

## 📊 預期成果

**完成後**:
```
✅ 筆記智能建議
✅ AI 對話功能
✅ 聊天歷史儲存
✅ 快速問題模板
✅ 對話導出
```

**代碼規模估計**:
- NoteAIAssistant.tsx: ~300 行
- API 端點: ~200 行
- 資料庫遷移: ~50 行
- 總計: ~550 行

---

## ⚠️ 注意事項

1. **Gemini API 限額**: 確保提示詞語言清晰，減少重試
2. **流式回應**: 考慮大型建議是否需要流式傳輸
3. **對話上下文**: 可能需要限制歷史長度以控制 token 使用
4. **錯誤降級**: API 失敗時提供有意義的錯誤消息

---

## 🚀 啟動命令

```bash
# 創建 migration
npx prisma migrate dev --name add_chat_messages

# 開始開發
npm run dev
```

---

*準備就緒: 2025-01-30*  
*預期開始: 立即*  
*預期完成: 3 週內*
