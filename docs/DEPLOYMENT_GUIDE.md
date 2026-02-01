# TestMoltbot 部署指南

## 目錄

- [開發環境設置](#開發環境設置)
- [生產部署](#生產部署)
- [環境配置](#環境配置)
- [數據庫遷移](#數據庫遷移)
- [故障排查](#故障排查)
- [監控和日誌](#監控和日誌)

---

## 開發環境設置

### 前提條件

- Node.js 18+ 
- npm 9+
- Git

### 快速開始

```bash
# 1. 克隆項目
git clone https://github.com/BertWang/TestMoltbot.git
cd TestMoltbot

# 2. 安裝依賴
npm install

# 3. 配置環境變數
cp .env.example .env.local

# 編輯 .env.local
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=file:./dev.db
```

### 啟動開發服務

```bash
# 啟動開發伺服器 (localhost:3000)
npm run dev

# 在另一個終端，初始化數據庫
npx prisma migrate dev
npx prisma db seed
```

訪問 http://localhost:3000 即可開始使用。

---

## 生產部署

### 使用 Vercel（推薦）

Vercel 是 Next.js 官方推薦的託管平台。

```bash
# 1. 推送代碼到 GitHub
git push origin main

# 2. 訪問 https://vercel.com
# 3. 連接你的 GitHub 項目
# 4. 配置環境變數：
#    - GEMINI_API_KEY
#    - DATABASE_URL (使用 Neon PostgreSQL)

# 5. Vercel 自動部署
```

### 使用 Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 構建
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# 構建和運行
docker build -t testmoltbot .
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -e DATABASE_URL=postgresql://... \
  testmoltbot
```

### 使用 PM2（自託管）

```bash
# 1. 安裝 PM2
npm install -g pm2

# 2. 啟動應用
pm2 start npm --name "testmoltbot" -- start

# 3. 監控
pm2 monit

# 4. 開機自啟
pm2 startup
pm2 save
```

---

## 環境配置

### 必需的環境變數

```env
# AI 提供商
GEMINI_API_KEY=<你的 Google Gemini API 密鑰>

# 數據庫
DATABASE_URL=file:./dev.db  # SQLite (開發)
# 或
DATABASE_URL=postgresql://user:pass@host/db  # PostgreSQL (生產)

# OCR 提供商（可選）
AZURE_VISION_KEY=<Azure 密鑰>
GOOGLE_VISION_KEY=<Google Vision 密鑰>
```

### 可選的性能配置

```env
# 快取
REDIS_URL=redis://localhost:6379

# 日誌
LOG_LEVEL=info  # debug, info, warn, error

# 限流
MAX_REQUESTS_PER_MINUTE=5
RATE_LIMIT_WINDOW=60000
```

---

## 數據庫遷移

### 開發環境

```bash
# 創建新遷移
npx prisma migrate dev --name add_feature_name

# 重置數據庫（謹慎！）
npx prisma migrate reset

# 檢查遷移狀態
npx prisma migrate status
```

### 生產環境

```bash
# 預覽遷移變更
npx prisma migrate deploy --preview-feature

# 執行遷移
npx prisma migrate deploy

# 創建備份（推薦）
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### 種子數據

```bash
# 初始化推薦服務、OCR 提供商等
npx prisma db seed
```

---

## 構建和優化

### 生產構建

```bash
# 1. 構建應用
npm run build

# 2. 驗證構建
npm run build:analyze  # 分析包大小

# 3. 測試生產構建
npm run start

# 4. 運行測試
npm run test
npm run test:e2e
```

### 性能優化

```bash
# 啟用 ISR (增量靜態再生)
// next.config.ts
export default {
  experimental: {
    isrMemoryCacheSize: 50 * 1024 * 1024, // 50MB
  },
}

# 圖片優化
// 使用 Next.js Image 組件
<Image src="/note.jpg" alt="..." />
```

---

## 故障排查

### 常見問題

#### 1. 依賴衝突

```bash
# 清理 node_modules
rm -rf node_modules package-lock.json
npm install
```

#### 2. 數據庫連接失敗

```bash
# 驗證 DATABASE_URL
echo $DATABASE_URL

# 測試連接
npx prisma db execute --stdin < /dev/null

# 重新初始化
npx prisma migrate reset
```

#### 3. Gemini API 錯誤

```bash
# 驗證 API 密鑰
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
  https://generativelanguage.googleapis.com/v1/models/list

# 檢查配額
# 訪問 Google Cloud Console > API 和服務 > 配額
```

#### 4. OOM 內存不足

```bash
# 增加 Node.js 內存限制
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### 日誌查看

```bash
# Docker 容器日誌
docker logs -f container_id

# PM2 日誌
pm2 logs testmoltbot

# 系統日誌
tail -f /var/log/syslog | grep testmoltbot
```

---

## 監控和日誌

### 設置監控

```bash
# 1. 使用 PM2 Plus（推薦）
pm2 plus

# 2. 設置告警
pm2 set pm2-auto-pull on
pm2 install pm2-auto-restart
```

### 應用健康檢查

```bash
# 創建健康檢查端點
curl http://localhost:3000/api/health

# 預期響應
{
  "status": "healthy",
  "uptime": 3600,
  "database": "connected",
  "workers": 4
}
```

### 性能監控

```bash
# 關鍵指標
- 平均響應時間 < 500ms
- 成功率 > 99%
- 錯誤率 < 0.1%
- 內存使用 < 512MB
```

---

## 備份策略

### 日常備份

```bash
# PostgreSQL 備份
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz

# 上傳到 S3
aws s3 cp backup_*.sql.gz s3://my-bucket/backups/

# 定時任務 (crontab)
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

### 恢復

```bash
# 從備份恢復
gunzip < backup_20260201.sql.gz | psql $DATABASE_URL
```

---

## 安全檢查清單

- [ ] 生成強密碼和 API 密鑰
- [ ] 配置防火牆規則
- [ ] 啟用 HTTPS
- [ ] 設置 CORS
- [ ] 定期更新依賴
- [ ] 啟用速率限制
- [ ] 配置備份和恢復計畫
- [ ] 設置安全日誌

---

## 聯繫支持

- GitHub Issues: https://github.com/BertWang/TestMoltbot/issues
- 郵件: support@testmoltbot.dev
