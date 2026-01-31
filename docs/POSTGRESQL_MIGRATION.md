# PostgreSQL 遷移指南

## 概述

本指南說明如何將 TestMoltbot 從 SQLite 遷移到 PostgreSQL 以支援生產環境。

## 為什麼選擇 PostgreSQL？

✅ **優勢**：
- 更好的並發性能
- 支援複雜查詢和索引
- 適合大規模數據
- 原生的 JSON 支援
- 更安全的數據完整性

## 遷移步驟

### 1. 準備新的 PostgreSQL 實例

```bash
# 使用 Docker Compose
docker-compose up -d postgres

# 或使用 Heroku
heroku addons:create heroku-postgresql:standard-0
```

### 2. 更新 .env 配置

```bash
# 開發環境 (.env.local)
DATABASE_URL="postgresql://user:password@localhost:5432/test_moltbot"

# 生產環境
DATABASE_URL="postgresql://user:password@your-host:5432/test_moltbot"
```

### 3. 安裝 PostgreSQL 驅動

```bash
npm install @prisma/client pg
```

### 4. 更新 Prisma Schema

將 `prisma/schema.prisma` 中的 datasource 從 SQLite 改為 PostgreSQL：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 5. 執行遷移

```bash
# 生成遷移文件
npx prisma migrate deploy

# 或創建新遷移
npx prisma migrate dev --name postgres_migration
```

### 6. 數據遷移

#### 方案 A: Prisma 內置遷移

```bash
# 使用 prisma/migrate 自動遷移
npx prisma migrate deploy
```

#### 方案 B: 手動遷移腳本

```typescript
// scripts/migrate-to-postgres.ts
import { PrismaClient as SQLitePrisma } from '@prisma/client';
import { PrismaClient as PostgresPrisma } from '@prisma/client';

// 從 SQLite 讀取數據
const sqlite = new SQLitePrisma({
  datasources: { db: { url: 'file:./dev.db' } }
});

// 寫入到 PostgreSQL
const postgres = new PostgresPrisma();

async function migrate() {
  console.log('開始遷移...');
  
  // 遷移筆記
  const notes = await sqlite.note.findMany();
  for (const note of notes) {
    await postgres.note.create({ data: note });
  }
  
  // 遷移其他表...
  
  console.log('遷移完成！');
  await sqlite.$disconnect();
  await postgres.$disconnect();
}

migrate();
```

運行：
```bash
npx ts-node scripts/migrate-to-postgres.ts
```

### 7. 添加索引以優化性能

```sql
-- 連接到 PostgreSQL
psql postgresql://user:password@localhost:5432/test_moltbot

-- 添加必要的索引
CREATE INDEX idx_note_status ON "Note"(status);
CREATE INDEX idx_note_created ON "Note"("createdAt" DESC);
CREATE INDEX idx_note_tags ON "Note" USING GIN(to_tsvector('chinese', tags));
CREATE INDEX idx_collection_user ON "Collection"("userId");
CREATE INDEX idx_search_history_user ON "SearchHistory"("userId", "createdAt" DESC);

-- 分析表統計
ANALYZE;
```

### 8. 測試遷移

```bash
# 測試連接
npm run dev

# 驗證數據完整性
curl http://localhost:3000/api/notes

# 測試搜尋功能
curl 'http://localhost:3000/api/search?q=test'
```

### 9. 備份和回滾計畫

```bash
# 在遷移前備份 SQLite
cp prisma/dev.db prisma/dev.db.backup

# PostgreSQL 備份
pg_dump postgresql://user:password@localhost:5432/test_moltbot > backup.sql

# 如需回滾
psql postgresql://user:password@localhost:5432/test_moltbot < backup.sql
```

## 生產環境部署

### Vercel + PostgreSQL (推薦)

```bash
# 1. 在 Vercel 中添加環境變數
VERCEL_ENV=production
DATABASE_URL="postgresql://..."

# 2. 部署
vercel deploy --prod

# 3. 運行遷移
vercel run "npx prisma migrate deploy"
```

### Railway

```bash
# 1. 創建 Railway 專案
railway init

# 2. 添加 PostgreSQL
railway add

# 3. 部署
railway up
```

### Heroku

```bash
# 1. 創建應用
heroku create your-app-name

# 2. 添加 PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# 3. 部署
git push heroku main

# 4. 運行遷移
heroku run "npx prisma migrate deploy"
```

## 性能優化建議

### 1. 連接池設置

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // PgBouncer 連接池
  // url = env("DATABASE_URL_POOL")
}
```

### 2. 查詢優化

```typescript
// 使用 select 限制返回字段
const notes = await prisma.note.findMany({
  select: {
    id: true,
    summary: true,
    tags: true,
    createdAt: true,
  },
  take: 20,
  orderBy: { createdAt: 'desc' },
});
```

### 3. 緩存策略

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// 緩存查詢結果
const cacheKey = `notes:list:${page}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const notes = await prisma.note.findMany();
await redis.setex(cacheKey, 3600, JSON.stringify(notes));
```

## 故障排查

### 連接問題

```bash
# 測試 PostgreSQL 連接
psql $DATABASE_URL

# 檢查連接字符串格式
postgresql://[user[:password]@][netloc][:port][/dbname]
```

### 遷移失敗

```bash
# 查看遷移狀態
npx prisma migrate status

# 回滾最後一次遷移
npx prisma migrate resolve --rolled-back migration_name
```

### 性能問題

```sql
-- 檢查表大小
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname != 'pg_catalog'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 檢查慢查詢
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 成本估算

| 選項 | 月成本 | 規格 |
|------|--------|------|
| Heroku PostgreSQL | $50+ | 10GB, 20 連接 |
| Railway | $20+ | 按使用量計費 |
| AWS RDS | $30+ | db.t3.micro |
| Google Cloud SQL | $35+ | 2GB RAM, 10GB 儲存 |
| DigitalOcean Managed | $15+ | 1GB RAM, 25GB 儲存 |

## 相關資源

- [Prisma PostgreSQL 文檔](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#postgresql)
- [PostgreSQL 官方文檔](https://www.postgresql.org/docs/)
- [Vercel PostgreSQL 集成](https://vercel.com/docs/storage/vercel-postgres)
