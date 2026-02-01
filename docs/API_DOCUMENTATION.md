# TestMoltbot API 文檔

## 🚀 快速開始

本文檔介紹 TestMoltbot 的所有 API 端點、使用方式和最佳實踐。

### 基礎 URL

```
http://localhost:3000/api
```

---

## 📋 目錄

1. [OCR 管理](#ocr-管理)
2. [筆記管理](#筆記管理)
3. [MCP 市場](#mcp-市場)
4. [搜尋功能](#搜尋功能)
5. [身份驗證](#身份驗證)

---

## OCR 管理

### 上傳和處理筆記

**端點**: `POST /upload`

上傳圖片文件並觸發 AI 處理。

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@note.jpg"
```

**請求**:
- `file` (FormData) - 圖片檔案 (JPG, PNG, WEBP, 最大 10MB)

**響應**:
```json
{
  "success": true,
  "noteId": "cuid123",
  "status": "PROCESSING"
}
```

---

## 筆記管理

### 獲取所有筆記

**端點**: `GET /notes`

```bash
curl http://localhost:3000/api/notes
```

**響應**:
```json
{
  "success": true,
  "notes": [
    {
      "id": "cuid123",
      "imageUrl": "/uploads/filename.jpg",
      "refinedContent": "# 會議筆記\n...",
      "summary": "關於 Q1 季度計畫的討論",
      "tags": "會議,計畫,2026",
      "status": "COMPLETED",
      "createdAt": "2026-02-01T12:00:00Z"
    }
  ]
}
```

### 更新筆記

**端點**: `PUT /notes/[id]`

```bash
curl -X PUT http://localhost:3000/api/notes/cuid123 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 更新的內容",
    "tags": "新標籤,更新"
  }'
```

### 刪除筆記

**端點**: `DELETE /notes`

批次刪除多個筆記。

```bash
curl -X DELETE http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["id1", "id2", "id3"]
  }'
```

---

## MCP 市場

### 瀏覽服務市場

**端點**: `GET /mcp/marketplace`

```bash
# 瀏覽所有服務
curl http://localhost:3000/api/mcp/marketplace

# 按分類篩選
curl http://localhost:3000/api/mcp/marketplace?category=search

# 搜尋服務
curl http://localhost:3000/api/mcp/marketplace?search=openai
```

**響應**:
```json
{
  "success": true,
  "marketplace": [
    {
      "id": "service-id",
      "displayName": "OpenAI",
      "description": "OpenAI GPT 集成",
      "category": "ai",
      "type": "openai",
      "rating": 4.5,
      "totalInstalls": 1250,
      "isInstalled": true
    }
  ],
  "categories": ["search", "ai", "integration"]
}
```

### 安裝服務

**端點**: `POST /mcp/install`

```bash
curl -X POST http://localhost:3000/api/mcp/install \
  -H "Content-Type: application/json" \
  -d '{
    "registryId": "service-id",
    "config": {
      "apiKey": "your-api-key",
      "endpoint": "https://api.service.com"
    }
  }'
```

### 驗證服務配置

**端點**: `POST /mcp/[id]/validate`

```bash
curl -X POST http://localhost:3000/api/mcp/service-id/validate
```

**響應**:
```json
{
  "success": true,
  "status": "valid",
  "checks": {
    "configComplete": {
      "passed": true,
      "message": "✓ 配置字段完整"
    },
    "credentialsValid": {
      "passed": true,
      "message": "✓ 認證信息有效"
    }
  },
  "issues": [],
  "suggestions": []
}
```

### 服務評分和收藏

**評分**:
```bash
curl -X POST http://localhost:3000/api/mcp/service-id/rate \
  -H "Content-Type: application/json" \
  -d '{ "rating": 5 }'
```

**收藏**:
```bash
curl -X POST http://localhost:3000/api/mcp/service-id/favorite \
  -H "Content-Type: application/json" \
  -d '{ "action": "add" }'
```

### 智能故障轉移

**端點**: `GET /mcp/failover?serviceId=[id]`

獲取故障轉移配置和備用服務。

```bash
curl http://localhost:3000/api/mcp/failover?serviceId=service-id
```

**觸發故障轉移**:
```bash
curl -X POST http://localhost:3000/api/mcp/failover \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "service-id",
    "reason": "Health check failed"
  }'
```

### 獲取推薦

**端點**: `GET /mcp/recommendations`

```bash
# 通用推薦
curl http://localhost:3000/api/mcp/recommendations?limit=10

# 個性化推薦
curl http://localhost:3000/api/mcp/recommendations/personalized?category=search
```

### 分析儀表板

**端點**: `GET /mcp/operations/analytics`

獲取系統性能和成本分析數據。

```bash
curl http://localhost:3000/api/mcp/operations/analytics
```

**響應**:
```json
{
  "success": true,
  "analytics": {
    "averageResponseTime": 245,
    "successRate": 0.987,
    "totalCost": 28.50,
    "monthlyUsage": 1250,
    "providers": [
      {
        "provider": "gemini",
        "avgResponseTimeMs": 200,
        "successRate": 0.99,
        "costPerRequest": 0.01,
        "monthlyUsage": 800
      }
    ]
  }
}
```

---

## 搜尋功能

### 全文搜尋

**端點**: `GET /search`

```bash
curl "http://localhost:3000/api/search?q=會議筆記&limit=20"
```

### 搜尋建議

**端點**: `GET /search/suggestions`

```bash
curl "http://localhost:3000/api/search/suggestions?query=會"
```

---

## 身份驗證

目前版本使用 MVP 模式 (單用戶)，無需身份驗證。

---

## 錯誤處理

所有錯誤響應遵循統一格式：

```json
{
  "error": "錯誤信息",
  "details": "詳細說明",
  "code": "ERROR_CODE"
}
```

### 常見狀態碼

| 狀態碼 | 說明 |
|--------|------|
| 200 | 成功 |
| 400 | 請求無效 |
| 404 | 資源未找到 |
| 429 | 請求過於頻繁 |
| 500 | 伺服器錯誤 |

---

## 速率限制

- **AI 處理**: 5 個請求/分鐘
- **API 呼叫**: 無速率限制（本地開發）

---

## 最佳實踐

1. **錯誤處理**: 始終檢查響應狀態碼和錯誤信息
2. **重試邏輯**: 對於 429 錯誤，使用指數退避重試
3. **批次操作**: 使用批次端點減少 API 調用次數
4. **快取**: 快取靜態數據，如市場列表

---

## 示例：完整工作流

```bash
# 1. 上傳筆記
curl -X POST http://localhost:3000/api/upload \
  -F "file=@myNote.jpg"
# 返回: { "noteId": "abc123" }

# 2. 等待 AI 處理完成
sleep 2

# 3. 獲取處理結果
curl http://localhost:3000/api/notes/abc123

# 4. 更新筆記
curl -X PUT http://localhost:3000/api/notes/abc123 \
  -H "Content-Type: application/json" \
  -d '{ "tags": "重要,2026計畫" }'

# 5. 查看分析數據
curl http://localhost:3000/api/mcp/operations/analytics
```

---

## 支持

如有問題，請檢查：
1. 伺服器是否運行 (`npm run dev`)
2. `.env.local` 是否配置正確
3. 數據庫是否初始化 (`npx prisma migrate dev`)
