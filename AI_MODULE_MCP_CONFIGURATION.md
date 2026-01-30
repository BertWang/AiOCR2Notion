# AI 服務、模組和 MCP 配置指南

## 📚 架構概述

TestMoltbot 現已支持完全可配置的 AI 服務、模組化處理管道和 MCP（Model Context Protocol）集成。

```
┌─────────────────────────────────────────────────────────┐
│           上傳筆記 (Upload Notes)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
     ┌──────────────────────────────────────┐
     │  AI 提供商工廠 (AI Provider Factory) │
     │  - Gemini ✓                          │
     │  - OpenAI ✓                          │
     │  - Azure (待實現)                    │
     │  - Claude (待實現)                   │
     └────────────┬─────────────────────────┘
                  │
                  ▼
     ┌──────────────────────────────────────┐
     │   處理管道 (Processing Pipeline)    │
     │  ├─ OCR Processing                   │
     │  ├─ Text Cleanup (模組)               │
     │  ├─ Tagging (模組)                   │
     │  └─ Classification                   │
     └────────────┬─────────────────────────┘
                  │
                  ▼
     ┌──────────────────────────────────────┐
     │   模組系統 (Module System)           │
     │  - TextCleanupModule ✓               │
     │  - TaggingModule ✓                   │
     │  - 自定義模組 (可擴展)               │
     └────────────┬─────────────────────────┘
                  │
                  ▼
     ┌──────────────────────────────────────┐
     │   MCP 服務器 (MCP Servers)           │
     │  - Notion ✓                          │
     │  - GitHub ✓                          │
     │  - Filesystem ✓                      │
     │  - Obsidian ✓                        │
     └────────────┬─────────────────────────┘
                  │
                  ▼
     ┌──────────────────────────────────────┐
     │   數據庫 (Prisma + SQLite)           │
     │   - 筆記內容                         │
     │   - 配置設定                         │
     │   - 集成信息                         │
     └──────────────────────────────────────┘
```

---

## 🔧 配置 AI 提供商

### 1. **Gemini (Google)**

#### 環境變數
```bash
GEMINI_API_KEY=your-gemini-api-key
AI_MODEL=gemini-2.0-flash  # 或其他支持的模型
```

#### API 端點
```bash
# 查看當前配置
curl http://localhost:3001/api/admin/ai-config

# 更新 AI 配置
curl -X PUT http://localhost:3001/api/admin/ai-config \
  -H "Content-Type: application/json" \
  -d '{
    "aiProvider": "gemini",
    "modelName": "gemini-2.0-flash",
    "config": {}
  }'

# 檢查健康狀態
curl -X POST http://localhost:3001/api/admin/ai-config \
  -H "Content-Type: application/json" \
  -d '{"action": "healthCheck"}'
```

### 2. **OpenAI (GPT-4 Vision)**

#### 環境變數
```bash
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-vision-preview
```

#### 配置示例
```bash
curl -X PUT http://localhost:3001/api/admin/ai-config \
  -H "Content-Type: application/json" \
  -d '{
    "aiProvider": "openai",
    "modelName": "gpt-4-vision-preview",
    "config": {
      "temperature": 0.7,
      "max_tokens": 2000
    }
  }'
```

### 3. **Azure OpenAI** (待實現)

```bash
AZURE_OPENAI_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
```

### 4. **Anthropic Claude** (待實現)

```bash
CLAUDE_API_KEY=your-claude-api-key
```

---

## 📦 模組系統

### 內置模組

#### TextCleanupModule
清理和標準化文本內容。

```typescript
// 使用示例
const result = await fetch('/api/admin/modules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'execute',
    moduleName: 'TextCleanupModule',
    input: '你好  世界   '
  })
});
// 結果: "你好 世界"
```

#### TaggingModule
自動提取和生成標籤。

```typescript
const result = await fetch('/api/admin/modules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'execute',
    moduleName: 'TaggingModule',
    input: '這是一篇關於 #機器學習 和 #人工智能 的文章'
  })
});
// 結果: ["機器學習", "人工智能"]
```

### 查看所有模組

```bash
# 列出所有模組
curl "http://localhost:3001/api/admin/modules?action=list"

# 按類型查看
curl "http://localhost:3001/api/admin/modules?action=getByType&type=processor"
```

### 自定義模組開發

```typescript
// src/lib/modules/custom-module.ts
import { ModuleInterface, ModuleContext } from "@/lib/ai-service/types";

export class MyCustomModule implements ModuleInterface {
  name = "MyCustomModule";
  version = "1.0.0";
  type: "processor" = "processor";

  async init(context: ModuleContext): Promise<void> {
    context.logger.info("MyCustomModule initialized");
  }

  async execute(input: any, context: ModuleContext): Promise<any> {
    context.logger.info("Processing input");
    // 實現自定義邏輯
    return input.toUpperCase();
  }

  validate(input: any): boolean {
    return typeof input === "string";
  }
}
```

---

## 🔗 MCP (Model Context Protocol) 配置

### 支持的集成

#### Notion
```bash
NOTION_API_KEY=your-notion-integration-token

# 啟用 Notion MCP
curl -X POST http://localhost:3001/api/admin/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "action": "toggleServer",
    "serverName": "Notion",
    "enabled": true
  }'
```

#### GitHub
```bash
GITHUB_TOKEN=your-github-personal-access-token

# 啟用 GitHub MCP
curl -X POST http://localhost:3001/api/admin/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "action": "toggleServer",
    "serverName": "GitHub",
    "enabled": true
  }'
```

#### Obsidian
```bash
OBSIDIAN_VAULT_PATH=/path/to/your/vault

# 查看 Obsidian 資源
curl -X GET http://localhost:3001/api/admin/mcp?action=resources
```

### MCP 操作

#### 查看可用資源
```bash
curl -X GET http://localhost:3001/api/admin/mcp?action=resources
```

響應示例：
```json
{
  "success": true,
  "resourceHandlers": [
    {
      "type": "notion_page",
      "operations": [
        {"name": "create", "requiresAuth": true},
        {"name": "read", "requiresAuth": true},
        {"name": "update", "requiresAuth": true},
        {"name": "delete", "requiresAuth": true},
        {"name": "search", "requiresAuth": true}
      ]
    }
  ]
}
```

#### 執行 MCP 操作
```bash
# 在 Notion 中創建一個頁面
curl -X POST http://localhost:3001/api/admin/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "action": "execute",
    "resourceType": "notion_page",
    "operation": "create",
    "input": {
      "title": "My AI-Generated Note",
      "content": "Auto-generated content..."
    }
  }'
```

#### 健康檢查
```bash
curl -X GET http://localhost:3001/api/admin/mcp?action=health
```

---

## 🚀 處理管道配置

### 查看當前管道配置

```bash
curl http://localhost:3001/api/admin/ai-config
```

### 自定義處理流程

```typescript
import { NotesProcessingPipeline } from "@/lib/processing-pipeline";

const pipeline = new NotesProcessingPipeline();

// 添加自定義階段
pipeline.addStage({
  name: "Custom Processing",
  type: "custom",
  enabled: true,
  processor: "MyCustomModule",
  timeout: 20000,
});

// 執行管道
const result = await pipeline.execute({
  filePath: "/path/to/image.jpg",
  mimeType: "image/jpeg",
});
```

---

## 💾 環境變數完整列表

```bash
# AI 提供商
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
AZURE_OPENAI_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
CLAUDE_API_KEY=your-claude-api-key

# MCP 服務器
NOTION_API_KEY=your-notion-integration-token
GITHUB_TOKEN=your-github-personal-access-token
OBSIDIAN_VAULT_PATH=/path/to/vault

# 模型配置
AI_MODEL=gemini-2.0-flash
OPENAI_MODEL=gpt-4-vision-preview
AI_PROVIDER=gemini

# 數據庫
DATABASE_URL=file:./dev.db

# 系統設定
LOG_LEVEL=info
NODE_ENV=development
```

---

## 📊 配置管理 API

### GET /api/admin/ai-config
獲取當前 AI 配置

### PUT /api/admin/ai-config
更新 AI 配置

```json
{
  "aiProvider": "gemini",
  "modelName": "gemini-2.0-flash",
  "config": {}
}
```

### POST /api/admin/ai-config
執行配置操作

```json
{
  "action": "healthCheck" // 或 "testProvider"
}
```

### GET /api/admin/modules
列出所有模組

### POST /api/admin/modules
執行模組操作

```json
{
  "action": "execute",
  "moduleName": "TextCleanupModule",
  "input": "text to process"
}
```

### GET /api/admin/mcp
查看 MCP 配置

### POST /api/admin/mcp
執行 MCP 操作

```json
{
  "action": "execute",
  "resourceType": "notion_page",
  "operation": "create",
  "input": {}
}
```

---

## ✨ 最佳實踐

### 1. 優先級設置
- 在 `SYSTEM_CONFIG` 中設置 AI 提供商優先級
- 配置備用提供商以實現容錯
- 定期檢查健康狀態

### 2. 管道優化
- 根據需求禁用不需要的處理階段
- 調整超時時間以適應不同模型
- 配置重試策略

### 3. 安全性
- 不在代碼中硬編碼 API 密鑰
- 使用環境變數管理敏感信息
- 定期輪換 API 密鑰

### 4. 監控
- 啟用日誌記錄 (`LOG_LEVEL=debug`)
- 定期進行健康檢查
- 監控 API 使用率

---

## 🐛 故障排除

### AI 提供商無法連接
```bash
# 1. 檢查環境變數
echo $GEMINI_API_KEY

# 2. 進行健康檢查
curl -X POST http://localhost:3001/api/admin/ai-config \
  -H "Content-Type: application/json" \
  -d '{"action": "healthCheck"}'

# 3. 測試新提供商
curl -X POST http://localhost:3001/api/admin/ai-config \
  -H "Content-Type: application/json" \
  -d '{
    "action": "testProvider",
    "aiProvider": "openai",
    "modelName": "gpt-4-vision-preview",
    "apiKey": "your-key"
  }'
```

### 模組執行失敗
```bash
# 1. 驗證模組存在
curl "http://localhost:3001/api/admin/modules?action=list"

# 2. 檢查輸入格式
# - 確保輸入符合模組的驗證要求

# 3. 查看日誌
LOG_LEVEL=debug npm run dev
```

### MCP 服務器無法連接
```bash
# 1. 檢查健康狀態
curl -X GET http://localhost:3001/api/admin/mcp?action=health

# 2. 驗證環境變數
echo $NOTION_API_KEY

# 3. 查看可用資源
curl -X GET http://localhost:3001/api/admin/mcp?action=resources
```

---

**最後更新**: 2025-01-30
**版本**: 2.0.0 (可配置 AI 架構)
