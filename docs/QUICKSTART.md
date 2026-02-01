# TestMoltbot - 快速開始指南

## 🎯 五分鐘快速入門

### 1️⃣ 安裝

```bash
# 克隆項目
git clone https://github.com/BertWang/TestMoltbot.git
cd TestMoltbot

# 安裝依賴
npm install

# 配置環境
cp .env.example .env.local
# 編輯 .env.local，添加 GEMINI_API_KEY
```

### 2️⃣ 啟動

```bash
# 初始化數據庫
npx prisma migrate dev

# 啟動開發伺服器
npm run dev

# 訪問 http://localhost:3000
```

### 3️⃣ 開始使用

1. **上傳筆記**: 拖曳或點擊上傳圖片
2. **等待 AI 處理**: 系統自動進行 OCR 和優化
3. **編輯筆記**: 在分割編輯器中修改內容
4. **管理服務**: 在 MCP 市場安裝集成服務

---

## 📦 主要功能

| 功能 | 說明 |
|------|------|
| 📸 **OCR 處理** | 自動將手寫/掃描轉為 Markdown |
| 🛍️ **MCP 市場** | 安裝和管理 AI/搜尋/集成服務 |
| ✨ **推薦系統** | 基於評分和使用的智能推薦 |
| 📊 **分析儀表板** | 性能監控和成本分析 |
| 🔄 **故障轉移** | 自動備用服務切換 |
| 🔍 **全文搜尋** | 快速查找筆記 |

---

## 🏗️ 系統架構

```
┌─────────────────────────────────────┐
│         React 前端界面               │
│    (上傳、編輯、搜尋、管理)         │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│     Next.js API Routes              │
│  (OCR、筆記、MCP、搜尋、分析)       │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   Prisma ORM + SQLite/PostgreSQL    │
│    (筆記、服務、評分、同步日誌)    │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│    Gemini 2.0 Flash AI              │
│    (OCR + 優化 + 摘要 + 標籤)      │
└─────────────────────────────────────┘
```

---

## 📚 文檔

- 📖 [API 文檔](docs/API_DOCUMENTATION.md) - 所有 API 端點
- 🚀 [部署指南](docs/DEPLOYMENT_GUIDE.md) - 生產部署
- 👤 [使用指南](docs/USER_GUIDE.md) - 功能說明
- 🔧 [開發者指南](COPILOT_INSTRUCTIONS.md) - 架構設計

---

## 🛠️ 常用命令

```bash
# 開發
npm run dev              # 啟動開發伺服器
npm run build            # 構建生產版本
npm run start            # 啟動生產伺服器

# 數據庫
npx prisma migrate dev   # 運行遷移
npx prisma studio       # 打開數據庫 GUI
npx prisma db seed      # 初始化示例數據

# 測試
npm run test             # 運行單元測試
npm run test:e2e        # 運行 E2E 測試
npm run lint            # 代碼檢查
```

---

## 🔑 環境配置

### 必需

```env
GEMINI_API_KEY=your_api_key  # Google Gemini API 密鑰
DATABASE_URL=file:./dev.db   # SQLite (開發) 或 PostgreSQL (生產)
```

### 可選

```env
AZURE_VISION_KEY=...         # Azure 圖像識別
GOOGLE_VISION_KEY=...        # Google Cloud Vision
REDIS_URL=...                # 用於快取
LOG_LEVEL=info               # 日誌級別
```

---

## 📊 技術棧

- **前端**: React 19 + Next.js 16 + shadcn/ui
- **後端**: Next.js API Routes + Prisma ORM
- **數據庫**: SQLite (開發) / PostgreSQL (生產)
- **AI**: Google Gemini 2.0 Flash
- **部署**: Vercel / Docker / PM2

---

## 🚀 下一步

1. **上傳第一張筆記**: 測試 OCR 功能
2. **安裝 MCP 服務**: 在市場中瀏覽並安裝
3. **查看分析**: 檢查性能指標
4. **配置推薦**: 根據使用習慣獲得建議

---

## 📞 支持

- 🐛 [報告 Bug](https://github.com/BertWang/TestMoltbot/issues)
- 💬 [提問](https://github.com/BertWang/TestMoltbot/discussions)
- 📧 [郵件](mailto:support@testmoltbot.dev)

---

## 📄 許可

MIT License - 詳見 [LICENSE](LICENSE)

---

## 🙏 感謝

感謝所有貢獻者和使用者的支持！

**版本**: 1.0.0  
**更新**: 2026-02-01
