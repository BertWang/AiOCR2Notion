# 🚀 TestMoltbot 部署指南

## 快速部署選項

### 選項 1: Vercel (推薦 - 最簡單)

**時間**: 5-10 分鐘  
**成本**: 免費層可用

#### 步驟

```bash
# 1. 安裝 Vercel CLI
npm install -g vercel

# 2. 登入 Vercel
vercel login

# 3. 部署 (首次)
vercel

# 4. 部署到生產環境
vercel --prod
```

#### 環境變數設置

在 Vercel Dashboard 添加以下環境變數:

```
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://... (使用 Vercel Postgres)
AI_PROVIDER=gemini
```

#### Vercel Postgres 設置

```bash
# 在 Vercel 項目中啟用 Postgres
vercel postgres create

# 獲取連接字符串並更新環境變數
```

---

### 選項 2: Railway

**時間**: 10-15 分鐘  
**成本**: $5/月起

#### 步驟

1. **創建 Railway 賬號**: https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. **選擇此倉庫**
4. **添加 PostgreSQL 服務**:
   - 點擊 "+ New"
   - 選擇 "Database" → "PostgreSQL"
   - Railway 會自動設置 DATABASE_URL

5. **配置環境變數**:
   ```
   GEMINI_API_KEY=your_api_key
   NODE_ENV=production
   ```

6. **部署**:
   - Railway 自動檢測 Dockerfile 並構建
   - 等待部署完成 (~5分鐘)

#### Railway CLI 部署

```bash
# 安裝 Railway CLI
npm i -g @railway/cli

# 登入
railway login

# 鏈接項目
railway link

# 部署
railway up
```

---

### 選項 3: Docker (自托管)

**時間**: 20-30 分鐘  
**成本**: 取決於服務器

#### 本地測試

```bash
# 1. 構建鏡像
docker build -t testmoltbot:latest .

# 2. 運行容器
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -e DATABASE_URL=file:./dev.db \
  testmoltbot:latest

# 3. 訪問
open http://localhost:3000
```

#### 使用 Docker Compose

```bash
# 1. 創建 .env 文件
cat > .env <<EOF
GEMINI_API_KEY=your_api_key
DATABASE_URL=file:./dev.db
EOF

# 2. 啟動服務
docker-compose up -d

# 3. 查看日誌
docker-compose logs -f

# 4. 停止服務
docker-compose down
```

#### 生產環境配置

```yaml
# docker-compose.prod.yml
services:
  app:
    image: testmoltbot:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
    depends_on:
      - postgres
    restart: always

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secure_password
    volumes:
      - pgdata:/var/lib/postgresql/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  pgdata:
```

---

### 選項 4: DigitalOcean App Platform

**時間**: 15-20 分鐘  
**成本**: $12/月起

#### 步驟

1. **創建 App**: https://cloud.digitalocean.com/apps
2. **連接 GitHub 倉庫**
3. **配置構建設置**:
   - Build Command: `npm run build && npx prisma generate`
   - Run Command: `npm start`
   - HTTP Port: `3000`

4. **添加 PostgreSQL 數據庫**:
   - 選擇 "Add Database"
   - 選擇 "PostgreSQL"
   - DO 自動設置 DATABASE_URL

5. **環境變數**:
   ```
   GEMINI_API_KEY=your_key
   NODE_ENV=production
   ```

---

## 數據庫遷移

### Vercel Postgres

```bash
# 連接到 Vercel Postgres
vercel env pull .env.local

# 運行遷移
npx prisma migrate deploy

# 生成 Prisma Client
npx prisma generate
```

### Railway PostgreSQL

```bash
# 獲取 DATABASE_URL
railway variables

# 設置本地環境
export DATABASE_URL="postgresql://..."

# 運行遷移
npx prisma migrate deploy
```

### Docker PostgreSQL

```bash
# 進入容器
docker-compose exec app sh

# 運行遷移
npx prisma migrate deploy
```

---

## CI/CD 設置

### GitHub Actions

創建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 環境變數清單

| 變數 | 必需 | 說明 |
|------|------|------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API 密鑰 |
| `DATABASE_URL` | ✅ | 數據庫連接字符串 |
| `AI_PROVIDER` | ❌ | AI 提供商 (默認: gemini) |
| `NODE_ENV` | ❌ | 環境 (production/development) |
| `GEMINI_MODEL` | ❌ | 模型版本 (默認: gemini-2.0-flash) |

---

## 性能優化建議

### 1. 啟用 CDN
- Vercel: 自動啟用
- Railway: 添加 Cloudflare
- Docker: 配置 Nginx 緩存

### 2. 圖片優化
- 已內建 Sharp 優化
- WebP 轉換自動執行
- 確保 `/uploads` 目錄有寫入權限

### 3. 數據庫優化
```sql
-- 創建索引
CREATE INDEX idx_notes_status ON "Note"("status");
CREATE INDEX idx_notes_created ON "Note"("createdAt" DESC);
CREATE INDEX idx_notes_tags ON "Note"("tags");
```

### 4. 環境配置
```env
# 生產環境建議
NODE_ENV=production
MAX_FILE_SIZE=10485760
RATE_LIMIT_PER_MINUTE=30
```

---

## 監控和日誌

### Vercel
```bash
# 查看日誌
vercel logs

# 實時日誌
vercel logs --follow
```

### Railway
```bash
# 查看日誌
railway logs

# 查看特定服務
railway logs --service app
```

### Docker
```bash
# 查看日誌
docker-compose logs -f app

# 查看最近 100 行
docker-compose logs --tail 100 app
```

---

## 故障排除

### 問題 1: 數據庫連接失敗
```bash
# 檢查 DATABASE_URL 格式
echo $DATABASE_URL

# 測試連接
npx prisma db pull
```

### 問題 2: Prisma Client 未生成
```bash
# 重新生成
npx prisma generate

# 檢查版本
npx prisma --version
```

### 問題 3: 圖片上傳失敗
```bash
# 檢查目錄權限
ls -la public/uploads

# 創建目錄
mkdir -p public/uploads
chmod 755 public/uploads
```

### 問題 4: 環境變數未載入
```bash
# Vercel: 檢查環境變數
vercel env ls

# Railway: 檢查環境變數
railway variables
```

---

## 回滾策略

### Vercel
```bash
# 查看部署歷史
vercel ls

# 回滾到特定部署
vercel rollback <deployment-url>
```

### Railway
- 在 Dashboard 選擇之前的部署
- 點擊 "Redeploy"

### Docker
```bash
# 使用之前的鏡像
docker-compose down
docker-compose pull
docker-compose up -d
```

---

## 成本估算

| 平台 | 免費層 | 付費起價 | 推薦用途 |
|------|--------|----------|----------|
| Vercel | ✅ (Hobby) | $20/月 (Pro) | 個人項目 |
| Railway | ❌ ($5 試用) | $5/月 | 小型團隊 |
| DigitalOcean | ❌ | $12/月 | 生產環境 |
| 自托管 | 取決於服務器 | $5-50/月 | 完全控制 |

---

## 安全檢查清單

- [ ] 環境變數未提交到 Git
- [ ] 數據庫使用強密碼
- [ ] HTTPS 已啟用
- [ ] CORS 正確配置
- [ ] API 速率限制已啟用
- [ ] 文件上傳大小限制
- [ ] Prisma Client 在生產環境生成
- [ ] 日誌不包含敏感信息

---

**最後更新**: 2026-01-31  
**維護者**: Copilot 監督系統
