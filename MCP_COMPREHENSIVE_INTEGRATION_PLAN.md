# MCP (Model Context Protocol) 深度集成規劃文檔
## 版本 1.0 | 2026年1月

---

## 📋 目錄
1. [MCP 核心概念](#1-mcp-核心概念)
2. [常見公開服務集成方案](#2-常見公開-mcp-服務集成方案)
3. [MCP 最佳實踐](#3-mcp-最佳實踐)
4. [TestMoltbot 集成策略](#4-testmoltbot-的集成策略)
5. [實施路線圖](#5-實施路線圖)
6. [代碼示例和範本](#6-代碼示例和範本)
7. [常見問題解決](#7-常見問題解決)

---

## 1. MCP 核心概念

### 1.1 MCP 是什麼？

**Model Context Protocol** 是一個開放標準，用於在 AI 模型和外部工具/系統之間建立標準化的通信接口。它解決了 AI 系統訪問外部資源的複雜性問題。

#### 核心設計原則
```
┌─────────────────────────────────────────────┐
│          AI Model/Claude/Copilot            │
│              (Client Role)                   │
└────────────────────┬────────────────────────┘
                     │
        MCP Protocol (JSON-RPC 2.0)
                     │
                     ▼
┌─────────────────────────────────────────────┐
│   MCP Server (Integration Layer)             │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Resources    │  │ Tools        │         │
│  │ Prompts      │  │ Error Handle │         │
│  └──────────────┘  └──────────────┘         │
└────────────────────┬────────────────────────┘
                     │
        Transport Layer (stdio/HTTP/WebSocket)
                     │
                     ▼
┌─────────────────────────────────────────────┐
│   External Systems (Backend Services)        │
│  • Notion API                               │
│  • GitHub API                               │
│  • Slack API                                │
│  • Database                                 │
│  • File System                              │
└─────────────────────────────────────────────┘
```

### 1.2 架構和運作原理

#### 四層架構

| 層級 | 功能 | 示例 |
|------|------|------|
| **表現層** | AI 模型推理 | Claude 使用 MCP 資源回答問題 |
| **協議層** | JSON-RPC 2.0 標準化通信 | 請求/響應格式規範 |
| **傳輸層** | 底層連接機制 | stdio、HTTP、WebSocket |
| **系統層** | 實際資源/服務 | Notion、GitHub、數據庫 |

#### 運作流程（時序圖文字描述）

```
時刻 T0: Client 初始化
  ├─ Client 發送 initialize 消息
  ├─ Server 響應能力聲明 (capabilities)
  └─ 建立 protocol 連接

時刻 T1-T2: 資源發現
  ├─ Client 查詢 resources/list
  ├─ Server 返回可用資源清單
  └─ Client 檢查資源是否满足需求

時刻 T3-T5: 工具調用
  ├─ Client 請求 tools/list
  ├─ Server 返回可用工具及參數 Schema
  ├─ Client 發送 tools/call 請求
  ├─ Server 執行工具邏輯
  └─ Server 返回執行結果

時刻 T6-T8: 資源讀取
  ├─ Client 請求 resources/read
  ├─ Server 提取資源內容
  ├─ Server 格式化內容 (MIME type)
  └─ Server 返回資源內容

時刻 T9: 錯誤處理
  ├─ 若任何階段失敗
  ├─ Server 返回 error 消息
  ├─ Client 記錄失敗原因
  └─ Client 決定重試或回退
```

### 1.3 Server 和 Client 的關係

#### 角色定義

```typescript
// Server 端 (MCP服務方)
class MCPServer {
  // 定義能做什麼
  capabilities: {
    resources: boolean;      // 能否提供資源
    tools: boolean;          // 能否提供工具
    prompts: boolean;        // 能否提供提示詞
  };

  // 暴露的資源列表
  listResources(): Resource[];
  
  // 暴露的工具列表
  listTools(): Tool[];
  
  // 實現工具調用
  callTool(name: string, args: Record<string, any>): Promise<any>;
}

// Client 端 (AI模型端)
class MCPClient {
  // 連接到 Server
  async connect(serverUri: string): Promise<void>;
  
  // 發現並使用資源
  async getResources(): Promise<Resource[]>;
  async readResource(uri: string): Promise<ResourceContent>;
  
  // 調用工具
  async listTools(): Promise<Tool[]>;
  async callTool(toolName: string, args: Record<string, any>): Promise<any>;
}

// 關係模型
Client 主動 --發起請求--> Server
            <--返回結果-- Server 被動響應
```

#### 交互模式

**拉取模式（Poll）**
```
Client: "你有什麼資源？"
Server: "我有 Notion DB、GitHub repos 等"
Client: "給我 Notion DB 的內容"
Server: [返回數據]
```

**推送模式（Push）**
```
Server: "我有新的通知！"
Client: "接收到"
Client: "幫我處理這個"
Server: [執行操作]
```

### 1.4 資源、工具、提示詞的定義

#### 資源 (Resources)

資源是 **只讀** 的數據，通過特殊的 URI scheme 訪問。

```typescript
interface Resource {
  uri: string;              // 唯一標識，例: notion://database/abc123
  name: string;             // 可讀名稱
  description?: string;     // 描述
  mimeType?: string;        // MIME 類型 (text/plain, application/json)
  annotations?: {
    label?: string;         // UI 展示標籤
    description?: string;   // 詳細說明
  };
}

// 示例
{
  uri: "notion://database/projects",
  name: "項目數據庫",
  description: "所有進行中的項目",
  mimeType: "application/json",
  annotations: {
    label: "Notion 項目",
    description: "實時同步的項目清單"
  }
}
```

#### 工具 (Tools)

工具是 **可執行** 的函數，帶有清晰的輸入/輸出 Schema。

```typescript
interface Tool {
  name: string;             // 工具名稱
  description: string;      // 功能描述
  inputSchema: JSONSchema;  // 輸入參數的 JSON Schema
}

// 示例：Notion 創建頁面工具
{
  name: "notion_create_page",
  description: "在 Notion 數據庫中創建新頁面",
  inputSchema: {
    type: "object",
    properties: {
      database_id: {
        type: "string",
        description: "目標數據庫 ID"
      },
      title: {
        type: "string",
        description: "頁面標題"
      },
      properties: {
        type: "object",
        description: "頁面屬性對象"
      }
    },
    required: ["database_id", "title"]
  }
}
```

#### 提示詞 (Prompts)

提示詞是預定義的 prompt templates，支持動態參數注入。

```typescript
interface Prompt {
  name: string;             // 提示詞名稱
  description: string;      // 用途描述
  arguments?: PromptArgument[]; // 動態參數列表
}

interface PromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

// 示例：「總結 Notion 頁面」提示詞
{
  name: "summarize_notion_page",
  description: "快速總結一個 Notion 頁面的內容",
  arguments: [
    {
      name: "page_id",
      description: "Notion 頁面 ID",
      required: true
    },
    {
      name: "style",
      description: "總結風格 (bullet | paragraph | table)",
      required: false
    }
  ]
}
```

### 1.5 文本和二進制傳輸

#### 內容類型

```typescript
interface ResourceContent {
  // 文本內容
  text?: string;            // 純文本或 JSON 字符串

  // 二進制內容
  blob?: {
    mimeType: string;       // 例: image/png, application/pdf
    data: string;           // Base64 編碼的二進制數據
  };
}

// 傳輸示例

// 文本資源（Notion 頁面）
GET notion://page/abc123
→ {
    text: "{\"title\": \"Meeting Notes\", \"content\": \"...\"}"
  }

// 二進制資源（圖片）
GET github://repo/owner/repo/blob/main/logo.png
→ {
    blob: {
      mimeType: "image/png",
      data: "iVBORw0KGgoAAAANSUhEUgAAAAUA..."  // Base64
    }
  }

// 大文件處理策略
// 如果文件 > 10MB，使用分塊傳輸：
1. Client 請求分塊列表
2. Server 返回分塊 URI 列表
3. Client 逐個請求分塊
4. Client 組裝成完整內容
```

#### 編碼格式

| 格式 | 適用場景 | 示例 |
|------|--------|------|
| `text/plain` | 原始文本 | 筆記內容 |
| `application/json` | 結構化數據 | Notion 頁面 |
| `text/markdown` | Markdown 文檔 | GitHub README |
| `text/html` | HTML 頁面 | 網頁爬取 |
| `image/*` | 圖片（Base64） | 截圖、文檔掃描 |
| `application/pdf` | PDF 文檔 | 報告、論文 |

### 1.6 超時和錯誤處理機制

#### 超時策略

```typescript
interface TimeoutConfig {
  // 連接級別
  connectionTimeout: number;      // 默認 30 秒
  
  // 請求級別
  requestTimeout: number;         // 默認 60 秒
  
  // 工具執行級別
  toolExecutionTimeout: number;   // 默認 300 秒（5分鐘）
  
  // 資源讀取級別
  resourceReadTimeout: number;    // 默認 120 秒
}

// 實現示例
async function callToolWithTimeout(
  tool: Tool,
  args: Record<string, any>,
  timeout: number = 300000  // 5 分鐘
): Promise<any> {
  return Promise.race([
    executeToolLogic(tool, args),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Tool execution timeout after ${timeout}ms`)),
        timeout
      )
    )
  ]);
}
```

#### 錯誤分類和處理

```typescript
enum MCPErrorCode {
  // 協議錯誤 (-32700 ~ -32600)
  PARSE_ERROR = -32700,           // 解析 JSON 失敗
  INVALID_REQUEST = -32600,       // 無效的 JSON-RPC 請求

  // Server 錯誤 (-32099 ~ -32000)
  INTERNAL_ERROR = -32603,        // Server 內部錯誤
  INVALID_PARAMS = -32602,        // 工具參數無效
  METHOD_NOT_FOUND = -32601,      // 工具不存在
  
  // 應用級錯誤 (-9999 ~ -1000)
  RESOURCE_NOT_FOUND = -9001,     // 資源不存在
  AUTHENTICATION_FAILED = -9002,  // 認證失敗
  RATE_LIMIT_EXCEEDED = -9003,    // 速率限制
  TIMEOUT = -9004,                // 操作超時
  PERMISSION_DENIED = -9005,      // 權限不足
}

interface MCPError {
  code: MCPErrorCode;
  message: string;
  data?: Record<string, any>;      // 額外上下文
}

// 錯誤處理策略
const errorHandlers: Record<MCPErrorCode, (error: MCPError) => void> = {
  [MCPErrorCode.RATE_LIMIT_EXCEEDED]: async (error) => {
    // 實現指數退避重試
    await exponentialBackoff(initialDelay, maxRetries);
  },
  
  [MCPErrorCode.TIMEOUT]: async (error) => {
    // 增加超時時間或路由到備份 server
    switchToBackupServer();
  },
  
  [MCPErrorCode.AUTHENTICATION_FAILED]: async (error) => {
    // 刷新認證令牌
    await refreshCredentials();
  },
  
  [MCPErrorCode.RESOURCE_NOT_FOUND]: async (error) => {
    // 記錄並返回友好錯誤信息
    logAndNotify(error);
  },
};
```

#### 重試策略

```typescript
interface RetryPolicy {
  maxRetries: number;              // 最大重試次數
  initialDelayMs: number;          // 初始延遲
  maxDelayMs: number;              // 最大延遲
  backoffMultiplier: number;       // 退避倍數
  retryableErrorCodes: MCPErrorCode[]; // 可重試的錯誤碼
}

// 指數退避實現
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<T> {
  let lastError: Error | null = null;
  let delay = policy.initialDelayMs;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // 檢查是否應該重試
      const errorCode = extractErrorCode(error);
      if (!policy.retryableErrorCodes.includes(errorCode)) {
        throw error;  // 不可重試的錯誤，直接拋出
      }

      // 不是最後一次嘗試，則等待後重試
      if (attempt < policy.maxRetries) {
        await sleep(delay);
        delay = Math.min(
          delay * policy.backoffMultiplier,
          policy.maxDelayMs
        );
      }
    }
  }

  throw lastError;
}

// 使用示例
const result = await executeWithRetry(
  () => callTool("notion_query", { database_id: "abc123" }),
  {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 32000,
    backoffMultiplier: 2,
    retryableErrorCodes: [
      MCPErrorCode.RATE_LIMIT_EXCEEDED,
      MCPErrorCode.TIMEOUT,
    ],
  }
);
```

---

## 2. 常見公開 MCP 服務集成方案

### 2.1 OpenClaw (筆記分析)

#### 服務介紹

OpenClaw 是專為筆記系統優化的 MCP 服務，提供：
- 自動分類和標籤生成
- 內容相似度分析
- 知識圖譜構建
- 多語言支持

#### 集成配置

```json
{
  "name": "OpenClaw MCP",
  "type": "openclaw",
  "enabled": true,
  "endpoint": "http://localhost:3001",
  "auth": {
    "type": "api_key",
    "key": "${OPENCLAW_API_KEY}"
  },
  "capabilities": {
    "resources": ["note", "collection", "graph"],
    "tools": ["analyze", "classify", "summarize", "extract_entities"]
  },
  "config": {
    "models": ["embedding-v2", "classifier-v1"],
    "batch_size": 10,
    "timeout": 300000
  }
}
```

#### 核心功能

```typescript
// 工具定義
const openclawTools = [
  {
    name: "openclaw_analyze_note",
    description: "分析筆記內容，提取主題、情感、實體",
    inputSchema: {
      type: "object",
      properties: {
        note_id: { type: "string" },
        content: { type: "string" },
        language: { type: "string", enum: ["zh-CN", "zh-TW", "en"] }
      },
      required: ["content"]
    }
  },
  
  {
    name: "openclaw_classify_note",
    description: "自動分類筆記",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string" },
        categories: { type: "array", items: { type: "string" } },
        confidence_threshold: { type: "number", minimum: 0, maximum: 1 }
      },
      required: ["content"]
    }
  },
  
  {
    name: "openclaw_build_knowledge_graph",
    description: "為筆記集合構建知識圖譜",
    inputSchema: {
      type: "object",
      properties: {
        note_ids: { type: "array", items: { type: "string" } },
        include_entities: { type: "boolean" },
        depth: { type: "integer", minimum: 1, maximum: 5 }
      },
      required: ["note_ids"]
    }
  }
];

// 實現示例
async function analyzeNoteWithOpenClaw(noteId: string, content: string) {
  const result = await callMCPTool("openclaw_analyze_note", {
    note_id: noteId,
    content: content,
    language: "zh-TW"
  });

  return {
    topics: result.topics,      // 主題列表
    sentiment: result.sentiment, // 情感分析 (positive/neutral/negative)
    entities: result.entities,   // 提取的實體
    keywords: result.keywords,   // 關鍵詞
    confidence: result.confidence
  };
}
```

#### TestMoltbot 集成點

```typescript
// 在上傳流程中集成 OpenClaw
async function processNoteWithOpenClaw(note: Note) {
  // 1. 調用 OpenClaw 分析
  const analysis = await analyzNoteWithOpenClaw(note.id, note.refinedContent);

  // 2. 更新資料庫
  await prisma.note.update({
    where: { id: note.id },
    data: {
      topics: JSON.stringify(analysis.topics),
      sentiment: analysis.sentiment,
      entities: JSON.stringify(analysis.entities),
      enhancedTags: [
        ...note.tags.split(","),
        ...analysis.keywords
      ].join(","),
      confidence: Math.min(note.confidence, analysis.confidence)
    }
  });

  // 3. 更新知識圖譜
  if (shouldBuildGraph()) {
    await buildKnowledgeGraph(note.collectionId);
  }
}
```

### 2.2 Brave Search MCP (搜尋)

#### 服務介紹

提供實時網路搜尋能力，支持：
- 網頁搜尋
- 新聞搜尋
- 圖片搜尋
- 內容提取

#### 集成配置

```json
{
  "name": "Brave Search MCP",
  "type": "brave-search",
  "enabled": true,
  "endpoint": "https://api.search.brave.com/res/v1",
  "auth": {
    "type": "api_key",
    "key": "${BRAVE_SEARCH_API_KEY}"
  },
  "capabilities": {
    "tools": [
      "web_search",
      "news_search",
      "image_search",
      "summarize_page"
    ]
  },
  "config": {
    "country": "TW",
    "language": "zh-Hant",
    "safe_search": "moderate"
  }
}
```

#### 核心功能

```typescript
const braveSearchTools = [
  {
    name: "brave_web_search",
    description: "搜尋網頁內容",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 20 },
        fresh_date: { type: "string", description: "pd (past day), pw (past week), pm (past month)" }
      },
      required: ["query"]
    }
  },

  {
    name: "brave_news_search",
    description: "搜尋最新新聞",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        count: { type: "integer" }
      },
      required: ["query"]
    }
  },

  {
    name: "brave_extract_content",
    description: "提取網頁內容",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        format: { type: "string", enum: ["markdown", "text", "html"] }
      },
      required: ["url"]
    }
  }
];

// 實現示例
async function searchAndSummarizeNote(noteKeywords: string[]) {
  const searchResults = [];

  for (const keyword of noteKeywords) {
    const results = await callMCPTool("brave_web_search", {
      query: keyword,
      limit: 5
    });

    searchResults.push({
      keyword,
      results: results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.description
      }))
    });
  }

  return searchResults;
}
```

### 2.3 GitHub MCP (代碼倉庫)

#### 集成配置

```json
{
  "name": "GitHub MCP",
  "type": "github",
  "enabled": true,
  "auth": {
    "type": "token",
    "token": "${GITHUB_TOKEN}"
  },
  "capabilities": {
    "resources": ["repo", "issue", "pull_request", "code"],
    "tools": ["search_code", "list_repos", "create_issue", "comment"]
  }
}
```

#### 核心工具

```typescript
const githubTools = [
  {
    name: "github_search_code",
    description: "在 GitHub 倉庫中搜尋代碼",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        repo: { type: "string", description: "owner/repo 格式" },
        language: { type: "string" }
      },
      required: ["query", "repo"]
    }
  },

  {
    name: "github_list_issues",
    description: "列出倉庫的 Issue",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string" },
        state: { type: "string", enum: ["open", "closed", "all"] },
        labels: { type: "array", items: { type: "string" } }
      },
      required: ["repo"]
    }
  },

  {
    name: "github_get_file",
    description: "獲取倉庫中的文件內容",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string" },
        path: { type: "string" },
        branch: { type: "string" }
      },
      required: ["repo", "path"]
    }
  }
];
```

### 2.4 Slack MCP (聊天協作)

#### 集成配置

```json
{
  "name": "Slack MCP",
  "type": "slack",
  "enabled": true,
  "auth": {
    "type": "oauth",
    "clientId": "${SLACK_CLIENT_ID}",
    "clientSecret": "${SLACK_CLIENT_SECRET}",
    "botToken": "${SLACK_BOT_TOKEN}"
  },
  "capabilities": {
    "tools": [
      "send_message",
      "search_messages",
      "create_channel",
      "add_reaction"
    ]
  }
}
```

#### 核心工具

```typescript
const slackTools = [
  {
    name: "slack_send_message",
    description: "發送 Slack 消息",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "頻道 ID 或名稱" },
        text: { type: "string" },
        blocks: { type: "array", description: "Slack Block Kit 元素" },
        thread_ts: { type: "string", description: "線程時間戳（用於回复）" }
      },
      required: ["channel", "text"]
    }
  },

  {
    name: "slack_search_messages",
    description: "搜尋 Slack 消息",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        channel: { type: "string" },
        sort: { type: "string", enum: ["score", "timestamp"] },
        limit: { type: "integer" }
      },
      required: ["query"]
    }
  }
];
```

### 2.5 Google Drive MCP (雲端儲存)

#### 集成配置

```json
{
  "name": "Google Drive MCP",
  "type": "google-drive",
  "enabled": true,
  "auth": {
    "type": "oauth",
    "clientId": "${GOOGLE_CLIENT_ID}",
    "clientSecret": "${GOOGLE_CLIENT_SECRET}",
    "refreshToken": "${GOOGLE_REFRESH_TOKEN}"
  },
  "capabilities": {
    "resources": ["file", "folder", "sheet", "document"],
    "tools": ["upload_file", "create_folder", "search", "export"]
  }
}
```

#### 核心工具

```typescript
const googleDriveTools = [
  {
    name: "gdrive_upload_file",
    description: "上傳文件到 Google Drive",
    inputSchema: {
      type: "object",
      properties: {
        file_data: { type: "string", description: "Base64 編碼的文件內容" },
        file_name: { type: "string" },
        mime_type: { type: "string" },
        folder_id: { type: "string" },
        description: { type: "string" }
      },
      required: ["file_data", "file_name", "mime_type"]
    }
  },

  {
    name: "gdrive_search",
    description: "搜尋 Google Drive 文件",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        file_type: { type: "string" }
      },
      required: ["query"]
    }
  }
];
```

### 2.6 Web Crawler MCP (網頁爬取)

#### 集成配置

```json
{
  "name": "Web Crawler MCP",
  "type": "web-crawler",
  "enabled": true,
  "config": {
    "timeout": 30000,
    "headers": {
      "User-Agent": "Mozilla/5.0 (MCP Web Crawler)"
    },
    "allowed_domains": ["*.github.com", "*.notion.so"],
    "denied_paths": ["/admin", "/private"]
  }
}
```

#### 核心工具

```typescript
const webCrawlerTools = [
  {
    name: "web_fetch_page",
    description: "提取網頁內容",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        format: { type: "string", enum: ["markdown", "html", "text"] },
        css_selector: { type: "string", description: "提取特定元素的 CSS 選擇器" }
      },
      required: ["url"]
    }
  },

  {
    name: "web_extract_structured",
    description: "提取結構化數據",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        schema: { type: "object", description: "目標數據結構定義" }
      },
      required: ["url", "schema"]
    }
  }
];
```

### 2.7 SQLite MCP (數據庫)

#### 集成配置

```json
{
  "name": "SQLite MCP",
  "type": "sqlite",
  "enabled": true,
  "config": {
    "database_path": "${DATABASE_URL}",
    "enable_write": true,
    "enable_schema_modification": false,
    "max_query_time": 30000
  }
}
```

#### 核心工具

```typescript
const sqliteTools = [
  {
    name: "sqlite_query",
    description: "執行 SQL 查詢",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        parameters: { type: "array" }
      },
      required: ["query"]
    }
  },

  {
    name: "sqlite_schema",
    description: "獲取數據庫結構",
    inputSchema: {
      type: "object",
      properties: {
        table_name: { type: "string" }
      }
    }
  }
];
```

### 2.8 Filesystem MCP (文件系統)

#### 集成配置

```json
{
  "name": "Filesystem MCP",
  "type": "filesystem",
  "enabled": true,
  "config": {
    "root_path": "/workspaces/TestMoltbot",
    "allowed_paths": [
      "./public/uploads",
      "./data/exports",
      "./docs"
    ],
    "denied_paths": [
      "./.env",
      "./node_modules"
    ],
    "enable_write": true,
    "enable_delete": false
  }
}
```

#### 核心工具

```typescript
const filesystemTools = [
  {
    name: "fs_read_file",
    description: "讀取文件內容",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      required: ["path"]
    }
  },

  {
    name: "fs_list_directory",
    description: "列出目錄內容",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        recursive: { type: "boolean" }
      },
      required: ["path"]
    }
  },

  {
    name: "fs_write_file",
    description: "寫入文件",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
        mode": { type: "string", enum: ["write", "append"] }
      },
      required: ["path", "content"]
    }
  }
];
```

---

## 3. MCP 最佳實踐

### 3.1 服務生命週期管理

#### 服務初始化

```typescript
class MCPServiceManager {
  private services = new Map<string, MCPService>();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1. 載入配置
      const configs = await this.loadConfigurations();
      
      // 2. 驗證配置
      for (const config of configs) {
        this.validateConfig(config);
      }

      // 3. 連接到服務
      for (const config of configs) {
        if (config.enabled) {
          await this.connectService(config);
        }
      }

      // 4. 執行健康檢查
      await this.healthCheck();

      this.initialized = true;
      console.log(`✅ MCP 服務管理器初始化完成，${this.services.size} 個服務就緒`);
    } catch (error) {
      console.error("❌ MCP 服務初始化失敗:", error);
      throw error;
    }
  }

  private async connectService(config: MCPConfig): Promise<void> {
    try {
      const service = new MCPService(config);
      await service.connect();
      this.services.set(config.name, service);
      console.log(`✅ 已連接: ${config.name}`);
    } catch (error) {
      if (config.required) {
        throw error;  // 必需服務連接失敗
      }
      console.warn(`⚠️  無法連接 ${config.name}:`, error);
    }
  }

  private async healthCheck(): Promise<void> {
    for (const [name, service] of this.services) {
      try {
        await service.ping();
      } catch (error) {
        console.error(`❌ ${name} 健康檢查失敗`);
      }
    }
  }
}
```

#### 服務關閉

```typescript
async function shutdown(serviceManager: MCPServiceManager): Promise<void> {
  console.log("🔄 正在關閉 MCP 服務...");

  const services = serviceManager.getAll();
  
  // 並行關閉所有服務
  const shutdownPromises = services.map(service => 
    service.disconnect().catch(error => {
      console.error(`⚠️  關閉 ${service.name} 時出錯:`, error);
    })
  );

  await Promise.all(shutdownPromises);
  console.log("✅ 所有 MCP 服務已關閉");
}
```

### 3.2 連接池和會話管理

#### 連接池實現

```typescript
class MCPConnectionPool {
  private connections: MCPConnection[] = [];
  private availableConnections: MCPConnection[] = [];
  private readonly maxConnections: number;
  private readonly minConnections: number;

  constructor(maxConnections: number = 10, minConnections: number = 2) {
    this.maxConnections = maxConnections;
    this.minConnections = minConnections;
  }

  async initialize(): Promise<void> {
    // 預建立最少連接數
    for (let i = 0; i < this.minConnections; i++) {
      const conn = await this.createConnection();
      this.connections.push(conn);
      this.availableConnections.push(conn);
    }
  }

  async acquire(): Promise<MCPConnection> {
    // 如果有可用連接，直接返回
    if (this.availableConnections.length > 0) {
      return this.availableConnections.pop()!;
    }

    // 如果未達到最大連接數，創建新連接
    if (this.connections.length < this.maxConnections) {
      const conn = await this.createConnection();
      this.connections.push(conn);
      return conn;
    }

    // 等待有連接被釋放
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.availableConnections.length > 0) {
          clearInterval(checkInterval);
          resolve(this.availableConnections.pop()!);
        }
      }, 100);
    });
  }

  async release(connection: MCPConnection): Promise<void> {
    if (connection.isHealthy()) {
      this.availableConnections.push(connection);
    } else {
      // 移除不健康的連接
      this.connections = this.connections.filter(c => c !== connection);
      await connection.close();

      // 如果連接數低於最少值，創建新連接
      if (this.connections.length < this.minConnections) {
        const newConn = await this.createConnection();
        this.connections.push(newConn);
        this.availableConnections.push(newConn);
      }
    }
  }

  private async createConnection(): Promise<MCPConnection> {
    const conn = new MCPConnection();
    await conn.connect();
    return conn;
  }

  async drain(): Promise<void> {
    for (const conn of this.connections) {
      await conn.close();
    }
    this.connections = [];
    this.availableConnections = [];
  }
}

// 使用示例
async function executeWithConnectionPool<T>(
  fn: (conn: MCPConnection) => Promise<T>,
  pool: MCPConnectionPool
): Promise<T> {
  const conn = await pool.acquire();
  try {
    return await fn(conn);
  } finally {
    await pool.release(conn);
  }
}
```

#### 會話管理

```typescript
interface MCPSession {
  id: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  metadata: Record<string, any>;
  connection: MCPConnection;
}

class MCPSessionManager {
  private sessions = new Map<string, MCPSession>();
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 分鐘

  createSession(userId: string, connection: MCPConnection): MCPSession {
    const session: MCPSession = {
      id: generateSessionId(),
      userId,
      startTime: new Date(),
      lastActivity: new Date(),
      metadata: {},
      connection
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async executeInSession<T>(
    sessionId: string,
    fn: (session: MCPSession) => Promise<T>
  ): Promise<T> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`會話 ${sessionId} 不存在`);
    }

    // 更新最後活動時間
    session.lastActivity = new Date();

    try {
      return await fn(session);
    } catch (error) {
      console.error(`會話 ${sessionId} 執行出錯:`, error);
      throw error;
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.connection.close();
      this.sessions.delete(sessionId);
    }
  }

  // 定期清理過期會話
  startCleanupTimer(): void {
    setInterval(() => {
      const now = new Date();
      for (const [id, session] of this.sessions) {
        const idleTime = now.getTime() - session.lastActivity.getTime();
        if (idleTime > this.sessionTimeout) {
          this.closeSession(id).catch(error => {
            console.error(`清理會話 ${id} 時出錯:`, error);
          });
        }
      }
    }, 60 * 1000);  // 每分鐘檢查一次
  }
}
```

### 3.3 錯誤恢復和重試策略

#### 自動恢復

```typescript
class MCPServiceWithRecovery {
  private retryPolicy: RetryPolicy;
  private circuitBreaker: CircuitBreaker;
  private healthChecker: HealthChecker;

  async callTool<T>(
    toolName: string,
    args: Record<string, any>
  ): Promise<T> {
    // 檢查熔斷器
    if (this.circuitBreaker.isOpen()) {
      throw new Error(`Service circuit breaker is open for ${toolName}`);
    }

    try {
      // 執行工具，帶重試
      const result = await this.executeWithRetry(
        () => this.executeTool(toolName, args),
        this.retryPolicy
      );

      // 成功後重置熔斷器
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      // 記錄失敗
      this.circuitBreaker.recordFailure();

      // 如果失敗次數過多，打開熔斷器
      if (this.circuitBreaker.shouldTrip()) {
        console.error(`Circuit breaker tripped for ${toolName}`);
        // 啟動自動恢復檢查
        this.startAutomaticRecovery();
      }

      throw error;
    }
  }

  private async startAutomaticRecovery(): Promise<void> {
    // 定期嘗試恢復
    const recoveryInterval = setInterval(async () => {
      try {
        const isHealthy = await this.healthChecker.check();
        if (isHealthy) {
          this.circuitBreaker.reset();
          clearInterval(recoveryInterval);
          console.log("✅ 服務已恢復");
        }
      } catch (error) {
        console.warn("🔄 服務恢復檢查中...");
      }
    }, 10000);  // 每 10 秒檢查一次
  }
}

// 熔斷器實現
class CircuitBreaker {
  private state: "closed" | "open" | "half-open" = "closed";
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private readonly successThreshold = 3;
  private successCount = 0;

  recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = "open";
    }
  }

  recordSuccess(): void {
    if (this.state === "half-open") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.reset();
      }
    } else if (this.state === "closed") {
      this.failureCount = 0;  // 重置失敗計數
    }
  }

  isOpen(): boolean {
    return this.state === "open";
  }

  shouldTrip(): boolean {
    return this.failureCount >= this.failureThreshold;
  }

  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.successCount = 0;
  }

  enterHalfOpen(): void {
    this.state = "half-open";
    this.successCount = 0;
  }
}
```

### 3.4 性能優化

#### 緩存策略

```typescript
interface CacheConfig {
  ttl: number;              // 時間到活 (毫秒)
  maxSize: number;          // 最大條目數
  strategy: "lru" | "lfu";  // 淘汰策略
}

class MCPCache {
  private cache = new Map<string, CachedValue>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(config: CacheConfig) {
    this.config = config;
  }

  get<T>(key: string): T | null {
    const value = this.cache.get(key);

    if (!value) {
      this.stats.misses++;
      return null;
    }

    // 檢查過期
    if (Date.now() - value.timestamp > this.config.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    value.accessCount++;
    this.stats.hits++;
    return value.data as T;
  }

  set<T>(key: string, value: T): void {
    // 如果達到最大大小，淘汰一條
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      accessCount: 0
    });
  }

  private evict(): void {
    const entries = Array.from(this.cache.entries());

    let keyToEvict: string;
    if (this.config.strategy === "lru") {
      // 淘汰最久未使用的
      keyToEvict = entries.reduce((oldest, [key, value]) => {
        const oldestValue = this.cache.get(oldest)!;
        return value.timestamp < oldestValue.timestamp ? key : oldest;
      });
    } else {
      // 淘汰訪問頻率最低的
      keyToEvict = entries.reduce((least, [key, value]) => {
        const leastValue = this.cache.get(least)!;
        return value.accessCount < leastValue.accessCount ? key : least;
      });
    }

    this.cache.delete(keyToEvict);
    this.stats.evictions++;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + "%" : "N/A"
    };
  }
}

interface CachedValue {
  data: any;
  timestamp: number;
  accessCount: number;
}
```

#### 批量操作優化

```typescript
class MCPBatchExecutor {
  private queue: BatchItem[] = [];
  private batchSize: number = 10;
  private flushInterval: number = 5000;  // 5 秒

  async add<T>(
    toolName: string,
    args: Record<string, any>
  ): Promise<Promise<T>> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        toolName,
        args,
        resolve,
        reject
      });

      if (this.queue.length >= this.batchSize) {
        this.flush();
      }
    });
  }

  private startAutoFlush(): void {
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      // 並行執行批量任務
      const results = await Promise.all(
        batch.map(item =>
          this.executeTool(item.toolName, item.args)
            .then(result => ({ success: true, result }))
            .catch(error => ({ success: false, error }))
        )
      );

      // 將結果返回給各個調用者
      batch.forEach((item, index) => {
        const { success, result, error } = results[index];
        if (success) {
          item.resolve(result);
        } else {
          item.reject(error);
        }
      });
    } catch (error) {
      // 如果批量操作本身失敗，拒絕所有項
      batch.forEach(item => item.reject(error));
    }
  }

  private async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    // 實現實際的工具執行邏輯
    // ...
  }
}

interface BatchItem {
  toolName: string;
  args: Record<string, any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}
```

### 3.5 安全和權限管理

#### 認證和授權

```typescript
interface MCPCredential {
  id: string;
  type: "api_key" | "oauth" | "jwt" | "basic";
  encrypted: boolean;
  expiresAt?: Date;
  scopes?: string[];
}

class MCPAuthManager {
  private credentials = new Map<string, MCPCredential>();
  private validator: AuthValidator;

  async validateRequest(
    serviceId: string,
    request: MCPRequest
  ): Promise<boolean> {
    const credential = this.credentials.get(serviceId);
    if (!credential) {
      throw new Error(`未找到 ${serviceId} 的認證信息`);
    }

    // 檢查過期
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      await this.refreshCredential(serviceId);
    }

    // 驗證請求簽名或令牌
    return this.validator.validate(credential, request);
  }

  async refreshCredential(serviceId: string): Promise<void> {
    const credential = this.credentials.get(serviceId);
    if (!credential) return;

    // 調用第三方 API 刷新令牌
    const newCredential = await this.callRefreshAPI(credential);
    this.credentials.set(serviceId, newCredential);
  }

  private async callRefreshAPI(credential: MCPCredential): Promise<MCPCredential> {
    // 具體實現取決於認證類型
    // ...
    return credential;
  }
}

// 權限檢查
class MCPPermissionChecker {
  async checkToolAccess(
    userId: string,
    toolName: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.tools.includes(toolName);
  }

  async checkResourceAccess(
    userId: string,
    resourceUri: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.resources.some(
      pattern => this.matchesPattern(resourceUri, pattern)
    );
  }

  private matchesPattern(uri: string, pattern: string): boolean {
    // 支持通配符匹配
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return regex.test(uri);
  }

  private async getUserPermissions(userId: string): Promise<UserPermissions> {
    // 從資料庫或緩存獲取用戶權限
    // ...
  }
}

interface UserPermissions {
  tools: string[];
  resources: string[];
}
```

#### 速率限制

```typescript
class MCPRateLimiter {
  private limits = new Map<string, RateLimit>();

  async checkLimit(userId: string, serviceId: string): Promise<boolean> {
    const key = `${userId}:${serviceId}`;
    const limit = this.limits.get(key) || this.createNewLimit(key);

    // 檢查是否超過限制
    if (limit.requests >= limit.maxRequests) {
      // 檢查時間窗口是否已重置
      const now = Date.now();
      if (now - limit.windowStart > limit.windowDuration) {
        limit.requests = 0;
        limit.windowStart = now;
      } else {
        return false;  // 超過限制
      }
    }

    limit.requests++;
    return true;
  }

  private createNewLimit(key: string): RateLimit {
    const limit: RateLimit = {
      requests: 0,
      maxRequests: 100,          // 每個時間窗口最多 100 個請求
      windowDuration: 60 * 1000,  // 1 分鐘
      windowStart: Date.now()
    };
    this.limits.set(key, limit);
    return limit;
  }
}

interface RateLimit {
  requests: number;
  maxRequests: number;
  windowDuration: number;
  windowStart: number;
}
```

---

## 4. TestMoltbot 的集成策略

### 4.1 如何與現有系統集成

#### 系統架構集成點

```
┌────────────────────────────────────────────────────────────┐
│                   TestMoltbot Core                          │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌──────────────────────────┐  │
│  │  Upload Zone    │         │  Split Editor            │  │
│  │  (React Client) │         │  (React Client)          │  │
│  └────────┬────────┘         └──────────┬───────────────┘  │
│           │                              │                  │
│     │───────────────────────────────────│                  │
│                    ▼                                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │          Next.js API Routes                         │  │
│  │  ┌──────────────────┐  ┌──────────────────────────┐ │  │
│  │  │ POST /api/upload │  │ PUT /api/notes/[id]      │ │  │
│  │  └──────────────────┘  │ (Content + Tags)         │ │  │
│  │                        └──────────────────────────┘ │  │
│  └────────────┬─────────────────────────────┬──────────┘  │
│               │                             │              │
│       ┌───────▼────────────────────────────▼──────────┐   │
│       │  🚀 MCP Integration Layer (NEW)               │   │
│       │  ┌────────────────────────────────────────┐   │   │
│       │  │ MCPServiceManager                      │   │   │
│       │  │ - Service Lifecycle                    │   │   │
│       │  │ - Connection Pool                      │   │   │
│       │  │ - Error Recovery                       │   │   │
│       │  └────────────────────────────────────────┘   │   │
│       └──────────┬────────────────────────────────────┘   │
│                  │                                         │
│     ┌────────────┴────────────────┬──────────────────┐    │
│     ▼                             ▼                  ▼    │
│  ┌──────────────┐  ┌────────────────────┐  ┌──────────┐  │
│  │ Gemini API   │  │ MCP Services       │  │ Prisma   │  │
│  │ (OCR/LLM)    │  │ (OpenClaw, etc)    │  │ (DB)     │  │
│  └──────────────┘  └────────────────────┘  └──────────┘  │
│                             │                              │
└─────────────────────────────┼──────────────────────────────┘
                              │
              External Services & APIs
                              │
        ┌─────────┬─────────┬─────────┬──────────┐
        ▼         ▼         ▼         ▼          ▼
    Notion    GitHub     Slack    Google Drive  Web
```

#### 集成點列表

| 層級 | 集成點 | 說明 |
|------|--------|------|
| 前端 | `upload-zone.tsx` | 新增 "關連服務" 選項 |
| API | `POST /api/upload` | 增加 MCP 後處理管道 |
| API | `PUT /api/notes/[id]` | 支持 MCP 同步選項 |
| 核心 | `gemini.ts` | 整合 MCP 資源獲取 |
| 數據 | `Note` 模型 | 新增 MCP 元數據字段 |
| 設置 | `settings/` | MCP 服務配置管理 |

### 4.2 前端交互模式

#### Upload 流程改進

```typescript
// 新的上傳對話框
interface UploadOptions {
  applyOpenClawAnalysis: boolean;     // 使用 OpenClaw 分析
  searchRelatedContent: boolean;      // 使用 Brave Search 查找相關內容
  syncToNotion: boolean;              // 同步到 Notion
  exportToGitHub: boolean;            // 導出到 GitHub
  notifySlack: boolean;               // 通知 Slack
}

// UI 組件
export function UploadWithMCPOptions() {
  const [options, setOptions] = useState<UploadOptions>({
    applyOpenClawAnalysis: true,
    searchRelatedContent: false,
    syncToNotion: false,
    exportToGitHub: false,
    notifySlack: false
  });

  return (
    <div>
      <UploadZone />
      
      <div className="mt-6 space-y-3">
        <h3>MCP 服務選項</h3>
        
        <label>
          <input
            type="checkbox"
            checked={options.applyOpenClawAnalysis}
            onChange={(e) => setOptions({
              ...options,
              applyOpenClawAnalysis: e.target.checked
            })}
          />
          使用 OpenClaw 進行內容分析
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={options.searchRelatedContent}
            onChange={(e) => setOptions({
              ...options,
              searchRelatedContent: e.target.checked
            })}
          />
          搜尋相關內容
        </label>

        <label>
          <input
            type="checkbox"
            checked={options.syncToNotion}
            onChange={(e) => setOptions({
              ...options,
              syncToNotion: e.target.checked
            })}
          />
          同步到 Notion
        </label>
      </div>
    </div>
  );
}
```

#### Split Editor 增強

```typescript
// 在 split-editor.tsx 中添加 MCP 操作面板
export function SplitEditorWithMCP({ note }: { note: Note }) {
  const [mcpActions, setMcpActions] = useState<MCPAction[]>([]);

  const runMCPAction = async (action: MCPActionName) => {
    switch (action) {
      case "search_references":
        // 使用 Brave Search 查找引用
        const references = await callMCPTool("brave_web_search", {
          query: note.summary || note.tags?.split(",")[0],
          limit: 5
        });
        setMcpActions([...mcpActions, { action, result: references }]);
        break;

      case "sync_to_notion":
        // 同步到 Notion
        await callMCPTool("notion_create_page", {
          database_id: notionDatabaseId,
          title: note.summary,
          content: note.refinedContent
        });
        toast.success("已同步到 Notion");
        break;

      case "export_to_github":
        // 導出到 GitHub
        await callMCPTool("github_create_gist", {
          filename: `${note.summary}.md`,
          content: note.refinedContent
        });
        toast.success("已導出到 GitHub");
        break;
    }
  };

  return (
    <div>
      <SplitEditor note={note} />
      
      <div className="mt-4 p-4 bg-stone-50 rounded-lg">
        <h3 className="font-semibold mb-3">MCP 操作</h3>
        <button onClick={() => runMCPAction("search_references")}>
          🔍 查找引用
        </button>
        <button onClick={() => runMCPAction("sync_to_notion")}>
          📝 同步到 Notion
        </button>
        <button onClick={() => runMCPAction("export_to_github")}>
          🐙 導出到 GitHub
        </button>
      </div>
    </div>
  );
}

type MCPActionName = "search_references" | "sync_to_notion" | "export_to_github";

interface MCPAction {
  action: MCPActionName;
  result: any;
}
```

### 4.3 後端服務管理

#### 改進的上傳路由

```typescript
// src/app/api/upload/route.ts (改進版)
import { MCPServiceManager } from "@/lib/mcp-service-manager";
import { processNoteWithMCP } from "@/lib/mcp/processors";

const mcpManager = new MCPServiceManager();

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const mcpOptions = JSON.parse(
    formData.get("mcpOptions") as string || "{}"
  ) as UploadOptions;

  // 1. 保存文件
  const publicUrl = await saveFile(file);

  // 2. 創建數據庫記錄
  const note = await prisma.note.create({
    data: {
      imageUrl: publicUrl,
      status: "PROCESSING",
      tags: "",
    },
  });

  // 3. AI 處理（原有邏輯）
  const aiResult = await processNoteWithGemini(filepath, file.type);

  // 4. 🚀 MCP 後處理
  if (mcpOptions.applyOpenClawAnalysis) {
    const analysis = await processNoteWithMCP(
      "openclaw",
      note.id,
      aiResult.refinedContent
    );
    aiResult.tags = [
      ...aiResult.tags,
      ...analysis.keywords
    ];
  }

  if (mcpOptions.searchRelatedContent) {
    const relatedContent = await callMCPTool("brave_web_search", {
      query: (aiResult.tags || [])[0],
      limit: 3
    });
    // 存儲相關內容引用
  }

  if (mcpOptions.syncToNotion) {
    await callMCPTool("notion_create_page", {
      database_id: getUserNotionDatabaseId(request),
      title: aiResult.summary,
      content: aiResult.refinedContent,
      tags: aiResult.tags
    });
  }

  // 5. 保存最終結果
  const updatedNote = await prisma.note.update({
    where: { id: note.id },
    data: {
      rawOcrText: aiResult.rawOcr,
      refinedContent: aiResult.refinedContent,
      summary: aiResult.summary,
      tags: aiResult.tags.join(","),
      confidence: aiResult.confidence,
      status: "COMPLETED",
    },
  });

  revalidatePath("/");
  return NextResponse.json({ success: true, noteId: updatedNote.id });
}
```

### 4.4 數據庫持久化

#### 改進的 Prisma Schema

```prisma
// prisma/schema.prisma

model Note {
  id                    String   @id @default(cuid())
  
  // 原有字段
  imageUrl              String
  rawOcrText            String?
  refinedContent        String?
  summary               String?
  tags                  String?
  confidence            Float?
  status                String   @default("PENDING")
  
  // 🚀 MCP 相關字段
  mcpMetadata           Json?    // 存儲 MCP 操作的元數據
  mcpServices           String?  // 已應用的 MCP 服務列表 (JSON)
  openclawAnalysis      Json?    // OpenClaw 分析結果
  braveSearchResults    Json?    // Brave Search 結果
  notionPageId          String?  // Notion 頁面 ID
  githubGistId          String?  // GitHub Gist ID
  slackThreadTs         String?  // Slack 線程時間戳
  
  // 同步狀態
  syncStatus            Json?    // 各服務的同步狀態
  lastMCPUpdate         DateTime?
  
  // 其他
  collectionId          String?
  collection            Collection? @relation(fields: [collectionId], references: [id])
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model MCPServiceConfig {
  id            String   @id @default(cuid())
  serviceType   String   // "notion", "github", "slack", etc.
  enabled       Boolean  @default(true)
  config        Json     // 服務特定的配置
  credentials   String?  // 加密的認證信息
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model MCPSyncLog {
  id            String   @id @default(cuid())
  noteId        String
  serviceType   String
  operation     String   // "sync", "export", "import"
  status        String   // "success", "failed", "pending"
  result        Json?    // 操作結果
  error         String?  // 錯誤信息
  createdAt     DateTime @default(now())
}
```

### 4.5 API 設計規範

#### RESTful API 端點

```typescript
/**
 * MCP 服務管理 API
 */

// GET /api/mcp/services
// 列出所有可用的 MCP 服務
// Response: { services: MCPServiceInfo[] }

// GET /api/mcp/services/:serviceType
// 獲取特定服務的詳細信息和配置選項
// Response: { service: MCPServiceInfo, configSchema: JSONSchema }

// POST /api/mcp/services/:serviceType/configure
// 配置 MCP 服務
// Body: { config: Record<string, any>, credentials: Record<string, any> }
// Response: { success: boolean, service: MCPServiceInfo }

// DELETE /api/mcp/services/:serviceType
// 刪除 MCP 服務配置

// GET /api/mcp/services/:serviceType/test
// 測試 MCP 服務連接
// Response: { connected: boolean, latency: number, status: string }

/**
 * 筆記 MCP 操作 API
 */

// POST /api/notes/:id/mcp/action
// 在筆記上執行 MCP 操作
// Body: { action: string, serviceType: string, params: Record<string, any> }
// Response: { success: boolean, result: any }

// GET /api/notes/:id/mcp/status
// 獲取筆記的 MCP 同步狀態
// Response: { synced: boolean, services: MCPSyncStatus[] }

// POST /api/notes/:id/mcp/sync
// 同步筆記到所有已配置的 MCP 服務
// Response: { success: boolean, results: Record<string, any> }

/**
 * MCP 操作記錄 API
 */

// GET /api/mcp/logs
// 獲取 MCP 操作日誌
// Query: ?serviceType=&status=&limit=&offset=
// Response: { logs: MCPSyncLog[], total: number }

// GET /api/mcp/logs/:logId
// 獲取特定日誌詳情

// DELETE /api/mcp/logs/:logId
// 刪除日誌
```

#### TypeScript 型別定義

```typescript
// src/lib/mcp/types.ts

interface MCPServiceInfo {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
  version: string;
  author: string;
  rating: number;
  users: string;
  status: "stable" | "beta" | "experimental";
}

interface MCPOperationRequest {
  action: string;                    // 操作名稱
  serviceType: string;               // 服務類型
  params: Record<string, any>;       // 操作參數
  async: boolean;                    // 是否異步執行
}

interface MCPOperationResult {
  success: boolean;
  action: string;
  serviceType: string;
  result?: any;
  error?: string;
  executionTime: number;            // 執行耗時 (ms)
}

interface MCPSyncStatus {
  serviceType: string;
  synced: boolean;
  lastSync: Date;
  externalId: string;               // 外部服務的記錄 ID
  status: "success" | "failed" | "pending";
  nextSync?: Date;
}

interface UploadOptions {
  applyOpenClawAnalysis: boolean;
  searchRelatedContent: boolean;
  syncToNotion: boolean;
  exportToGitHub: boolean;
  notifySlack: boolean;
}
```

---

## 5. 實施路線圖

### Phase 1: 核心 MCP 管理層 (第 1-2 周)

#### 目標
建立完整的 MCP 基礎框架，能夠連接和管理 MCP 服務。

#### 任務

```typescript
// Task 1.1: MCPServiceManager 核心實現
// 文件: src/lib/mcp-service-manager.ts
// 要求:
// - 服務生命週期管理 (initialize, connect, disconnect)
// - 連接池實現 (acquire, release, drain)
// - 會話管理
// - 健康檢查

// Task 1.2: 錯誤處理和重試
// 文件: src/lib/mcp/error-handler.ts, src/lib/mcp/retry-policy.ts
// 要求:
// - MCP 錯誤碼定義
// - 重試策略實現
// - 熔斷器模式

// Task 1.3: 認證和授權
// 文件: src/lib/mcp/auth-manager.ts
// 要求:
// - 認證方案支持 (API key, OAuth, JWT)
// - 令牌刷新
// - 權限檢查

// Task 1.4: 資料庫擴展
// 文件: prisma/schema.prisma
// 要求:
// - 新增 MCPServiceConfig 模型
// - 新增 MCPSyncLog 模型
// - 擴展 Note 模型 (MCP 元數據字段)
```

#### 交付物
- `MCPServiceManager` 類（含連接池、會話管理）
- 錯誤處理框架
- 認證/授權模塊
- 數據庫遷移

#### 驗收標準
```bash
# 可以成功初始化 MCP 管理器
✅ MCPServiceManager.initialize() 完成

# 連接池正常工作
✅ acquire/release 循環無泄漏

# 錯誤處理機制有效
✅ 429 速率限制錯誤被正確重試
✅ 超時錯誤被正確捕獲

# 數據庫遷移成功
✅ prisma migrate 完成
```

---

### Phase 2: 常見服務集成 (第 3-5 周)

#### 目標
集成 8 個常見的 MCP 服務，提供完整的功能覆蓋。

#### 任務

```typescript
// Task 2.1: OpenClaw 集成
// 文件: src/lib/mcp/services/openclaw.ts
// 所需文件:
// - openclaw-client.ts (API 客戶端)
// - openclaw-types.ts (型別定義)
// 功能:
// - analyzeNote: 分析筆記內容、提取主題、情感分析
// - classifyNote: 自動分類
// - buildKnowledgeGraph: 構建知識圖譜

// Task 2.2: Brave Search 集成
// Task 2.3: GitHub 集成
// Task 2.4: Slack 集成
// Task 2.5: Google Drive 集成
// Task 2.6: Web Crawler 集成
// Task 2.7: SQLite 集成
// Task 2.8: Filesystem 集成

// 每個服務需要:
// - 服務客戶端實現
// - 工具定義（JSON Schema）
// - 測試用例
// - 文檔
```

#### 集成優先級

| 優先級 | 服務 | 複雜度 | 價值 | 工作量 |
|--------|------|--------|------|--------|
| **High** | OpenClaw | 中 | 很高 | 40h |
| **High** | Brave Search | 低 | 高 | 20h |
| **High** | Filesystem | 低 | 高 | 15h |
| Medium | Notion | 高 | 中 | 35h |
| Medium | GitHub | 高 | 中 | 30h |
| Medium | Google Drive | 高 | 中 | 30h |
| Low | Slack | 中 | 低 | 20h |
| Low | SQLite | 中 | 低 | 15h |

#### 交付物
- 8 個服務客戶端實現
- API 端點集成
- UI 組件（服務配置表單）
- 集成測試

---

### Phase 3: UI/UX 完善 (第 6-7 周)

#### 目標
提供用戶友好的 MCP 服務配置和管理界面。

#### 任務

```typescript
// Task 3.1: MCP 設置頁面
// 文件: src/app/settings/mcp/page.tsx
// 功能:
// - 服務列表展示
// - 服務配置表單
// - 連接測試
// - 服務啟用/禁用切換

// Task 3.2: MCP 市場（已部分完成，需完善）
// 文件: src/components/mcp-marketplace.tsx
// 功能:
// - 瀏覽服務
// - 搜索過濾
// - 評分/評論
// - 一鍵安裝

// Task 3.3: 上傳時 MCP 選項
// 文件: src/components/upload-zone.tsx (改進)
// 功能:
// - MCP 操作複選框
// - 進度跟蹤
// - 錯誤提示

// Task 3.4: Split Editor MCP 面板
// 文件: src/components/split-editor.tsx (改進)
// 功能:
// - 快速操作按鈕
// - 同步狀態展示
// - MCP 結果展示
```

#### UI 組件列表

```typescript
// 新增組件:
- <MCPServiceList />           // 服務列表
- <MCPServiceConfigForm />     // 配置表單
- <MCPConnectionTest />        // 連接測試
- <MCPSyncStatus />            // 同步狀態
- <MCPActionPanel />           // 操作面板
- <MCPMarketplace />           // 市場（已有，需改進）
- <MCPLogViewer />             // 日誌查看器
```

---

### Phase 4: 性能和安全 (第 8-9 周)

#### 目標
優化系統性能，加強安全防護。

#### 任務

```typescript
// Task 4.1: 性能優化
// - 實現緩存層 (Redis/Memory)
// - 批量操作優化
// - 連接池調優
// - 速率限制實施

// Task 4.2: 安全加固
// - 認證令牌加密存儲
// - API 速率限制
// - 權限驗證
// - 審計日誌

// Task 4.3: 監控和告警
// - MCP 服務狀態監控
// - 性能指標收集
// - 告警規則配置
// - 健康檢查儀表板

// Task 4.4: 文檔和測試
// - API 文檔
// - 集成測試
// - 性能測試
// - 安全審計
```

---

## 6. 代碼示例和範本

### 6.1 新增 MCP 服務的完整步驟

#### 步驟 1: 定義類型

```typescript
// src/lib/mcp/services/my-service/types.ts
export interface MyServiceConfig {
  apiKey: string;
  endpoint: string;
  timeout?: number;
}

export interface MyServiceTool {
  name: string;
  description: string;
  execute: (params: Record<string, any>) => Promise<any>;
}
```

#### 步驟 2: 實現客戶端

```typescript
// src/lib/mcp/services/my-service/client.ts
import { MCPClient } from "@/lib/mcp/base-client";

export class MyServiceClient extends MCPClient {
  private apiKey: string;

  constructor(config: MyServiceConfig) {
    super(config.endpoint, { timeout: config.timeout });
    this.apiKey = config.apiKey;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    // 添加自定義初始化邏輯
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.call("GET", "/health", {});
      return response.status === "ok";
    } catch (error) {
      return false;
    }
  }

  async myCustomOperation(input: string): Promise<any> {
    return this.call("POST", "/operate", {
      input,
      apiKey: this.apiKey
    });
  }
}
```

#### 步驟 3: 註冊服務

```typescript
// src/lib/mcp/registry.ts
import { MyServiceClient } from "./services/my-service/client";

const mcpRegistry = new MCPRegistry();

mcpRegistry.register({
  id: "my-service",
  name: "My Service",
  type: "custom",
  create: (config: any) => new MyServiceClient(config),
  tools: [
    {
      name: "my_service_operation",
      description: "Execute a custom operation",
      inputSchema: {
        type: "object",
        properties: {
          input: { type: "string" }
        },
        required: ["input"]
      }
    }
  ]
});
```

#### 步驟 4: 創建 API 端點

```typescript
// src/app/api/mcp/services/my-service/route.ts
import { NextRequest, NextResponse } from "next/server";
import { mcpManager } from "@/lib/mcp-manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await mcpManager.executeTool("my-service", body.tool, body.params);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

### 6.2 配置文件範本

#### .mcp-services.json 範本

```json
{
  "services": [
    {
      "id": "openclaw",
      "type": "openclaw",
      "enabled": true,
      "name": "OpenClaw MCP",
      "config": {
        "endpoint": "http://localhost:3001",
        "models": ["embedding-v2", "classifier-v1"],
        "timeout": 300000
      },
      "auth": {
        "type": "api_key",
        "key": "${OPENCLAW_API_KEY}"
      }
    },
    {
      "id": "brave-search",
      "type": "brave-search",
      "enabled": true,
      "name": "Brave Search MCP",
      "config": {
        "country": "TW",
        "language": "zh-Hant",
        "safe_search": "moderate"
      },
      "auth": {
        "type": "api_key",
        "key": "${BRAVE_API_KEY}"
      }
    },
    {
      "id": "notion",
      "type": "notion",
      "enabled": false,
      "name": "Notion MCP",
      "config": {
        "database_id": "${NOTION_DATABASE_ID}",
        "sync_interval": 300000
      },
      "auth": {
        "type": "oauth",
        "token": "${NOTION_API_KEY}"
      }
    }
  ],
  "global": {
    "connectionPoolSize": 10,
    "requestTimeout": 60000,
    "retryAttempts": 3,
    "rateLimitPerMinute": 100
  }
}
```

### 6.3 環境變數範本

```bash
# .env.local.example

# MCP 服務配置
OPENCLAW_API_KEY=your_openclaw_key
OPENCLAW_ENDPOINT=http://localhost:3001

BRAVE_API_KEY=your_brave_key

NOTION_API_KEY=your_notion_token
NOTION_DATABASE_ID=your_database_id

GITHUB_TOKEN=your_github_token

SLACK_BOT_TOKEN=your_slack_token
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# MCP 全局設置
MCP_CONNECTION_POOL_SIZE=10
MCP_REQUEST_TIMEOUT=60000
MCP_RETRY_ATTEMPTS=3
MCP_RATE_LIMIT_PER_MINUTE=100
```

---

## 7. 常見問題解決

### Q1: 如何處理 MCP 服務連接失敗？

```typescript
// 實現自動重連
async function ensureServiceConnected(
  serviceId: string,
  maxRetries: number = 5
): Promise<MCPService> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const service = mcpManager.getService(serviceId);
      if (service.isConnected()) {
        return service;
      }
      
      // 嘗試重新連接
      await service.connect();
      return service;
    } catch (error) {
      lastError = error as Error;
      const delay = Math.pow(2, attempt) * 1000;  // 指數退避
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed to connect to ${serviceId}: ${lastError?.message}`);
}
```

### Q2: 如何實現 MCP 服務的降級方案？

```typescript
// 降級策略
async function callWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    console.warn("Primary service failed, trying fallback:", error);
    try {
      return await fallback();
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      throw new Error("Both primary and fallback failed");
    }
  }
}

// 使用示例
const result = await callWithFallback(
  () => callMCPTool("openclaw_analyze", { content }),
  () => callMCPTool("basic_analyze", { content })
);
```

### Q3: 如何監控 MCP 服務的性能？

```typescript
class MCPPerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>();

  recordOperation(
    serviceId: string,
    operation: string,
    duration: number,
    success: boolean
  ): void {
    const key = `${serviceId}:${operation}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push({
      timestamp: Date.now(),
      duration,
      success
    });
  }

  getStats(serviceId: string): PerformanceStats {
    const metrics = Array.from(this.metrics.values()).flat();
    
    return {
      avgDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      successRate: (metrics.filter(m => m.success).length / metrics.length) * 100,
      p95Duration: this.calculatePercentile(metrics.map(m => m.duration), 95),
      totalCalls: metrics.length
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

interface PerformanceMetric {
  timestamp: number;
  duration: number;
  success: boolean;
}

interface PerformanceStats {
  avgDuration: number;
  successRate: number;
  p95Duration: number;
  totalCalls: number;
}
```

### Q4: 如何在分佈式環境中管理 MCP 連接？

```typescript
// 使用 Redis 作為共享狀態存儲
class DistributedMCPManager {
  private redis: Redis;

  async acquireServiceLock(
    serviceId: string,
    lockTimeout: number = 30000
  ): Promise<boolean> {
    const lockKey = `mcp:lock:${serviceId}`;
    const result = await this.redis.set(
      lockKey,
      Date.now().toString(),
      "PX",
      lockTimeout,
      "NX"
    );
    return result === "OK";
  }

  async releaseServiceLock(serviceId: string): Promise<void> {
    const lockKey = `mcp:lock:${serviceId}`;
    await this.redis.del(lockKey);
  }

  async cacheServiceResult(
    serviceId: string,
    operation: string,
    params: Record<string, any>,
    result: any,
    ttl: number = 3600
  ): Promise<void> {
    const cacheKey = `mcp:cache:${serviceId}:${operation}:${JSON.stringify(params)}`;
    await this.redis.setex(
      cacheKey,
      ttl,
      JSON.stringify(result)
    );
  }

  async getCachedResult(
    serviceId: string,
    operation: string,
    params: Record<string, any>
  ): Promise<any | null> {
    const cacheKey = `mcp:cache:${serviceId}:${operation}:${JSON.stringify(params)}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }
}
```

### Q5: 如何安全地存儲 MCP 服務的認證信息？

```typescript
// 加密存儲
import crypto from "crypto";

class SecureCredentialManager {
  private encryptionKey: Buffer;

  constructor() {
    // 從環境變數獲取加密密鑰
    this.encryptionKey = Buffer.from(process.env.MCP_ENCRYPTION_KEY!, "hex");
  }

  encryptCredential(credential: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      this.encryptionKey,
      iv
    );

    let encrypted = cipher.update(JSON.stringify(credential), "utf8", "hex");
    encrypted += cipher.final("hex");

    // 返回 IV + 加密數據
    return `${iv.toString("hex")}:${encrypted}`;
  }

  decryptCredential(encrypted: string): any {
    const [ivHex, encryptedData] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      this.encryptionKey,
      iv
    );

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  }
}

// 使用
const credentialManager = new SecureCredentialManager();

// 存儲
const encrypted = credentialManager.encryptCredential({
  apiKey: "secret-key",
  token: "secret-token"
});

// 檢索
const decrypted = credentialManager.decryptCredential(encrypted);
```

---

## 總結

這份規劃文檔提供了：

✅ **深度的 MCP 概念理解** - 從架構、協議、資源模型到錯誤處理  
✅ **8 個常見服務的集成方案** - 配置、工具定義、實現示例  
✅ **完整的最佳實踐** - 生命週期、連接池、性能優化、安全防護  
✅ **TestMoltbot 特定的集成策略** - 前後端改進、API 設計、數據庫擴展  
✅ **9 周的實施路線圖** - 分階段、明確的任務和驗收標準  
✅ **生產級代碼示例** - 可直接使用的實現範本  
✅ **常見問題的解決方案** - 從連接失敗到分佈式管理

下一步建議：
1. **立即開始 Phase 1** - 構建 MCP 核心框架
2. **並行準備環境** - 安裝依賴、配置服務
3. **建立測試流程** - 確保每個服務都經過驗證
4. **文檔持續更新** - 記錄遇到的問題和解決方案

這個方案可以將 TestMoltbot 轉變為一個 **智能、可擴展、與生態深度集成的筆記系統**。
