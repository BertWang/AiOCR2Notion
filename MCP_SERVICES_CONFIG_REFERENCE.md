# MCP 服務配置參考指南

## 完整配置範本

### 1. OpenClaw 服務配置

#### 基本配置
```json
{
  "id": "openclaw",
  "name": "OpenClaw MCP",
  "type": "openclaw",
  "enabled": true,
  "endpoint": "http://localhost:3001",
  "auth": {
    "type": "api_key",
    "credentials": {
      "api_key": "${OPENCLAW_API_KEY}"
    }
  },
  "config": {
    "timeout": 300000,
    "models": ["embedding-v2", "classifier-v1"],
    "batch_size": 10,
    "features": {
      "analyze": true,
      "classify": true,
      "graph": true
    }
  },
  "required": true
}
```

#### 環境變數設置
```bash
# .env.local
OPENCLAW_API_KEY=sk_test_xxxxxxxxxxxxxxxx
OPENCLAW_ENDPOINT=http://localhost:3001
```

#### 可用工具
```typescript
// openclaw_analyze_note
{
  "content": "筆記內容",
  "language": "zh-TW"
}
// 返回: { topics, sentiment, entities, keywords, confidence }

// openclaw_classify_note
{
  "content": "筆記內容",
  "categories": ["工作", "學習", "生活"],
  "confidence_threshold": 0.7
}
// 返回: { classifications, confidence }

// openclaw_build_knowledge_graph
{
  "note_ids": ["id1", "id2"],
  "include_entities": true,
  "depth": 3
}
// 返回: { nodes, edges, metadata }
```

---

### 2. Brave Search 配置

#### 基本配置
```json
{
  "id": "brave-search",
  "name": "Brave Search MCP",
  "type": "brave-search",
  "enabled": true,
  "endpoint": "https://api.search.brave.com/res/v1",
  "auth": {
    "type": "api_key",
    "credentials": {
      "api_key": "${BRAVE_API_KEY}"
    }
  },
  "config": {
    "country": "TW",
    "language": "zh-Hant",
    "safe_search": "moderate",
    "timeout": 10000,
    "features": {
      "web_search": true,
      "news_search": true,
      "image_search": false
    }
  },
  "required": false
}
```

#### 環境變數設置
```bash
# .env.local
BRAVE_API_KEY=your_brave_api_key_here
```

#### 可用工具
```typescript
// brave_web_search
{
  "query": "搜索詞",
  "limit": 5,
  "fresh_date": "pw"  // pd, pw, pm
}
// 返回: { results: [{ title, url, snippet }] }

// brave_news_search
{
  "query": "新聞詞",
  "count": 10
}
// 返回: { news: [{ title, source, date, snippet }] }

// brave_extract_content
{
  "url": "https://example.com",
  "format": "markdown"
}
// 返回: { content, metadata }
```

---

### 3. GitHub 配置

#### 基本配置
```json
{
  "id": "github",
  "name": "GitHub MCP",
  "type": "github",
  "enabled": false,
  "auth": {
    "type": "token",
    "credentials": {
      "token": "${GITHUB_TOKEN}"
    }
  },
  "config": {
    "timeout": 15000,
    "rate_limit": 5000,
    "features": {
      "search_code": true,
      "list_repos": true,
      "create_issue": true,
      "comment": true,
      "create_gist": true
    }
  },
  "required": false
}
```

#### 環境變數設置
```bash
# .env.local
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 可用工具
```typescript
// github_search_code
{
  "query": "搜索詞",
  "repo": "owner/repo",
  "language": "typescript"
}

// github_list_issues
{
  "repo": "owner/repo",
  "state": "open",
  "labels": ["bug", "feature"]
}

// github_create_gist
{
  "filename": "notes.md",
  "content": "內容",
  "public": false
}

// github_get_file
{
  "repo": "owner/repo",
  "path": "README.md",
  "branch": "main"
}
```

---

### 4. Slack 配置

#### 基本配置
```json
{
  "id": "slack",
  "name": "Slack MCP",
  "type": "slack",
  "enabled": false,
  "auth": {
    "type": "oauth",
    "credentials": {
      "client_id": "${SLACK_CLIENT_ID}",
      "client_secret": "${SLACK_CLIENT_SECRET}",
      "bot_token": "${SLACK_BOT_TOKEN}"
    }
  },
  "config": {
    "workspace": "your-workspace",
    "timeout": 5000,
    "features": {
      "send_message": true,
      "search_messages": true,
      "create_channel": false,
      "add_reaction": true
    }
  },
  "required": false
}
```

#### 環境變數設置
```bash
# .env.local
SLACK_CLIENT_ID=1234567890.0000000000
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_BOT_TOKEN=xoxb-your-bot-token
```

#### 可用工具
```typescript
// slack_send_message
{
  "channel": "#general",  // 或頻道 ID
  "text": "消息內容",
  "thread_ts": "1234567890.000100"  // 可選，用於回复
}

// slack_search_messages
{
  "query": "搜索詞",
  "channel": "#channel-name",
  "sort": "score",
  "limit": 20
}

// slack_add_reaction
{
  "channel": "#channel",
  "timestamp": "1234567890.000100",
  "emoji": "thumbsup"
}
```

---

### 5. Google Drive 配置

#### 基本配置
```json
{
  "id": "google-drive",
  "name": "Google Drive MCP",
  "type": "google-drive",
  "enabled": false,
  "auth": {
    "type": "oauth",
    "credentials": {
      "client_id": "${GOOGLE_CLIENT_ID}",
      "client_secret": "${GOOGLE_CLIENT_SECRET}",
      "refresh_token": "${GOOGLE_REFRESH_TOKEN}"
    }
  },
  "config": {
    "timeout": 20000,
    "features": {
      "upload_file": true,
      "create_folder": true,
      "search": true,
      "export": true,
      "share": false
    }
  },
  "required": false
}
```

#### 環境變數設置
```bash
# .env.local
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

#### 可用工具
```typescript
// gdrive_upload_file
{
  "file_data": "base64_encoded_content",
  "file_name": "document.pdf",
  "mime_type": "application/pdf",
  "folder_id": "folder_id_or_null",  // 根目錄
  "description": "文檔描述"
}

// gdrive_search
{
  "query": "搜索詞",
  "file_type": "document"  // document, spreadsheet, presentation
}

// gdrive_export_file
{
  "file_id": "file_id",
  "export_format": "pdf"  // pdf, docx, xlsx
}
```

---

### 6. Web Crawler 配置

#### 基本配置
```json
{
  "id": "web-crawler",
  "name": "Web Crawler MCP",
  "type": "web-crawler",
  "enabled": false,
  "config": {
    "timeout": 30000,
    "headers": {
      "User-Agent": "Mozilla/5.0 (MCP Web Crawler)"
    },
    "allowed_domains": [
      "*.github.com",
      "*.notion.so",
      "*.wikipedia.org"
    ],
    "denied_paths": [
      "/admin",
      "/private",
      "/logout"
    ],
    "features": {
      "fetch_page": true,
      "extract_structured": true,
      "extract_markdown": true
    }
  },
  "required": false
}
```

#### 可用工具
```typescript
// web_fetch_page
{
  "url": "https://example.com",
  "format": "markdown",  // markdown, html, text
  "css_selector": ".article"  // 可選，提取特定元素
}

// web_extract_structured
{
  "url": "https://example.com",
  "schema": {
    "title": { "selector": "h1", "type": "text" },
    "price": { "selector": ".price", "type": "number" },
    "items": {
      "selector": ".item",
      "type": "array",
      "fields": {
        "name": { "selector": ".name" },
        "desc": { "selector": ".description" }
      }
    }
  }
}
```

---

### 7. SQLite 配置

#### 基本配置
```json
{
  "id": "sqlite",
  "name": "SQLite MCP",
  "type": "sqlite",
  "enabled": false,
  "config": {
    "database_path": "file:./dev.db",
    "enable_write": true,
    "enable_schema_modification": false,
    "max_query_time": 30000,
    "timeout": 5000,
    "features": {
      "query": true,
      "schema": true,
      "export": true
    }
  },
  "required": false
}
```

#### 可用工具
```typescript
// sqlite_query
{
  "query": "SELECT * FROM notes WHERE status = ?",
  "parameters": ["COMPLETED"]
}

// sqlite_schema
{
  "table_name": "Note"
}

// sqlite_export
{
  "query": "SELECT * FROM notes",
  "format": "json"  // json, csv
}
```

---

### 8. Filesystem 配置

#### 基本配置
```json
{
  "id": "filesystem",
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
      "./node_modules",
      "./.git"
    ],
    "enable_write": true,
    "enable_delete": false,
    "max_file_size": 104857600,  // 100MB
    "timeout": 10000,
    "features": {
      "read_file": true,
      "write_file": true,
      "list_directory": true,
      "delete_file": false
    }
  },
  "required": false
}
```

#### 可用工具
```typescript
// fs_read_file
{
  "path": "docs/README.md"
}

// fs_list_directory
{
  "path": "public/uploads",
  "recursive": false
}

// fs_write_file
{
  "path": "data/exports/notes.json",
  "content": "{}",
  "mode": "write"  // write, append
}
```

---

### 9. Notion 配置（進階）

#### 基本配置
```json
{
  "id": "notion",
  "name": "Notion MCP",
  "type": "notion",
  "enabled": false,
  "auth": {
    "type": "oauth",
    "credentials": {
      "api_key": "${NOTION_API_KEY}"
    }
  },
  "config": {
    "timeout": 15000,
    "version": "2022-06-28",
    "sync_interval": 300000,  // 5 分鐘同步一次
    "features": {
      "query_database": true,
      "create_page": true,
      "update_page": true,
      "search": true
    }
  },
  "required": false
}
```

#### 環境變數設置
```bash
# .env.local
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=your_database_id
```

#### 可用工具
```typescript
// notion_query_database
{
  "database_id": "database_id",
  "filter": {
    "property": "Status",
    "status": { "equals": "Done" }
  }
}

// notion_create_page
{
  "parent": { "database_id": "database_id" },
  "properties": {
    "Title": { "title": [{ "text": { "content": "頁面標題" } }] },
    "Status": { "status": { "name": "Done" } }
  }
}

// notion_update_page
{
  "page_id": "page_id",
  "properties": {
    "Status": { "status": { "name": "In Progress" } }
  }
}
```

---

## 全局配置

### mcp-config.json 完整示例

```json
{
  "services": [
    // ... 上面列出的各個服務配置
  ],
  "global": {
    "connectionPoolSize": 10,
    "minConnections": 2,
    "requestTimeout": 60000,
    "retryAttempts": 3,
    "retryDelay": 1000,
    "maxRetryDelay": 32000,
    "backoffMultiplier": 2,
    "rateLimitPerMinute": 100,
    "cacheConfig": {
      "enabled": true,
      "ttl": 300000,
      "maxSize": 1000,
      "strategy": "lru"
    },
    "monitoring": {
      "enabled": true,
      "metricsInterval": 60000,
      "alertingEnabled": true
    },
    "logging": {
      "level": "info",
      "format": "json",
      "destination": "stdout"
    }
  }
}
```

---

## 環境特定配置

### 開發環境 (.env.development)

```bash
# 連接池
MCP_POOL_MIN=2
MCP_POOL_MAX=5

# 超時
MCP_REQUEST_TIMEOUT=60000

# 重試
MCP_RETRY_ATTEMPTS=3
MCP_RETRY_DELAY=1000

# 日誌
MCP_LOG_LEVEL=debug
MCP_LOG_FORMAT=text

# 服務
OPENCLAW_ENDPOINT=http://localhost:3001
OPENCLAW_API_KEY=dev_key_xxx

# 緩存
MCP_CACHE_ENABLED=true
MCP_CACHE_TTL=60000
```

### 生產環境 (.env.production)

```bash
# 連接池
MCP_POOL_MIN=10
MCP_POOL_MAX=50

# 超時
MCP_REQUEST_TIMEOUT=30000

# 重試
MCP_RETRY_ATTEMPTS=5
MCP_RETRY_DELAY=2000

# 日誌
MCP_LOG_LEVEL=warn
MCP_LOG_FORMAT=json

# 服務
OPENCLAW_ENDPOINT=https://api.openclaw.io
OPENCLAW_API_KEY=${OPENCLAW_PROD_KEY}

# 緩存
MCP_CACHE_ENABLED=true
MCP_CACHE_TTL=3600000

# 安全
MCP_ENCRYPTION_KEY=${ENCRYPTION_KEY}
MCP_SSL_VERIFY=true
```

---

## 常見配置問題

### Q1: 如何隱藏敏感信息？

```bash
# ❌ 錯誤做法
{
  "auth": {
    "api_key": "sk_test_xxxxxxxx"
  }
}

# ✅ 正確做法
{
  "auth": {
    "api_key": "${OPENCLAW_API_KEY}"
  }
}

# 然後在 .env.local 中設置
OPENCLAW_API_KEY=sk_test_xxxxxxxx
```

### Q2: 如何為不同環境設置不同配置？

```typescript
// 在應用啟動時
const config = process.env.NODE_ENV === 'production'
  ? require('./mcp-config.prod.json')
  : require('./mcp-config.dev.json');

await mcpManager.initialize(config.services);
```

### Q3: 如何禁用某個服務而不刪除配置？

```json
{
  "id": "slack",
  "enabled": false,  // 設置為 false
  "name": "Slack MCP",
  // ... 其他配置保留
}
```

### Q4: 如何動態更新配置而不重啟應用？

```typescript
// 提供 API 端點動態更新配置
export async function updateServiceConfig(
  serviceId: string,
  newConfig: Partial<MCPServiceConfig>
) {
  // 驗證新配置
  validateConfig(newConfig);
  
  // 保存到數據庫或文件
  await prisma.mCPServiceConfig.update({
    where: { id: serviceId },
    data: newConfig
  });
  
  // 重新初始化服務（如需要）
  await mcpManager.reconnectService(serviceId);
}
```

---

## 驗證配置

### 配置驗證工具

```typescript
// src/lib/mcp/config-validator.ts

import { z } from 'zod';

const MCPServiceConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['openclaw', 'brave-search', 'github', 'slack', 'google-drive', 'web-crawler', 'sqlite', 'filesystem']),
  enabled: z.boolean(),
  endpoint: z.string().url().optional(),
  auth: z.object({
    type: z.enum(['api_key', 'oauth', 'jwt', 'basic']),
    credentials: z.record(z.string())
  }).optional(),
  config: z.record(z.any()).optional(),
  required: z.boolean().optional()
});

export function validateConfig(config: unknown) {
  return MCPServiceConfigSchema.parse(config);
}

// 使用
try {
  const validated = validateConfig(serviceConfig);
  console.log('✅ 配置有效');
} catch (error) {
  console.error('❌ 配置無效:', error.message);
}
```

### 運行時配置驗證

```bash
# 驗證所有配置
npm run validate:mcp-config

# 測試特定服務
npm run test:mcp-service -- --service=openclaw

# 測試連接
npm run test:mcp-connection -- --service=openclaw
```

---

## 故障排除

### 常見配置錯誤

| 錯誤 | 原因 | 解決方案 |
|------|------|---------|
| `Invalid config` | JSON 語法錯誤 | 檢查 JSON 格式，使用 JSON 驗證器 |
| `Service not found` | 服務 ID 不匹配 | 確保配置中的 ID 正確 |
| `Authentication failed` | 認證信息錯誤 | 檢查 API 密鑰和令牌 |
| `Connection timeout` | 無法連接到端點 | 檢查 endpoint URL，驗證網絡連接 |
| `Unknown service type` | 服務類型不支持 | 使用支持的服務類型之一 |

---

## 最佳實踐

1. **使用環境變數** - 敏感信息通過環境變數存儲
2. **版本控制忽略** - `.env.local` 不提交到版本控制
3. **配置驗證** - 應用啟動時驗證配置
4. **日誌記錄** - 記錄配置載入情況（不記錄敏感信息）
5. **備份配置** - 生產環境定期備份配置
6. **多環境支持** - 為開發/測試/生產提供不同配置
7. **動態更新** - 支持不重啟應用的配置更新
8. **熱重載** - 配置變化時自動重新連接服務

---

這份參考指南涵蓋了所有主要 MCP 服務的配置方法和最佳實踐。
