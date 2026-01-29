# 系統架構設計規劃書 (System Design Document)

這是一份針對 「智慧筆記批次掃描與歸檔系統」 的完整架構與流程設計文件。這份規劃書將作為開發前的藍圖，確保前後端邏輯清晰且具備擴充性。

## 1. 系統核心目標
構建一個基於 Next.js App Router 的全端應用，解決「大量紙本/手寫筆記數位化」的痛點。

核心價值在於：
1. **批次處理**：一次上傳多張圖片，後台自動排隊處理，不阻塞介面。
2. **雙重轉譯**：結合 **OCR (視覺識別) 與 LLM (語意修正)**，將破碎的辨識文字轉化為可閱讀的 Markdown 筆記。
3. **結構化歸檔**：將圖片與轉譯後的文案自動整合至目錄結構，形成個人知識庫。

***

## 2. 系統架構圖 (System Architecture)
我們採用 **事件驅動 (Event-Driven)** 架構來處理耗時的 OCR 任務，避免 Next.js Serverless Function 超時。

### 邏輯分層
* **展示層 (Presentation Layer)**: Next.js (React Server Components + Client Components)。
* **服務層 (Service Layer)**: Next.js Server Actions (作為 API Gateway) + 異步任務隊列 (Job Queue)。
* **數據層 (Data Layer)**: PostgreSQL/SQLite (元數據) + Object Storage (圖片實體)。
* **AI 處理層 (Processing Layer)**: OCR Provider (Gemini 2.0 Flash) + LLM Provider (Gemini)。

***

## 3. 詳細資料流設計 (Data Pipeline)
這是一個從「圖片」到「知識」的流水線設計。

### 階段一：攝取 (Ingestion)
1. **用戶動作**：在前端拖曳上傳 10 張筆記圖片。
2. **前端處理**：
   * 產生臨時預覽圖 (Thumbnail)。
   * 檢查檔案大小與格式 (支援 JPG/PNG/PDF)。
3. **後端接收 (Server Action)**：
   * 將圖片上傳至本地或雲端儲存 (`/uploads`)。
   * 在資料庫 `Note` 表中建立記錄，狀態設為 `PENDING`。
   * **觸發事件**：啟動 AI 處理流程。
   * **立即回應**：告知前端「上傳成功，開始處理」，UI 顯示進度條。

### 階段二：處理 (Processing - AI Pipeline)
1. **任務 A：多模態識別 (Gemini 2.0 Flash)**
   * 輸入圖片與 Prompt。
   * 執行 OCR (文字辨識) + 語意修正 (Markdown 格式化) + 自動摘要 + 標籤生成。
   * 產出 JSON 格式結果。

2. **任務 B：資料清洗與儲存**
   * 解析 JSON，寫入 `Note` 資料表的 `rawOcrText` (原始), `refinedContent` (修正後), `tags`, `summary` 欄位。
   * 計算 `confidence` 信心分數。
   * 狀態更新為 `COMPLETED`。

### 階段三：展示與歸檔 (Presentation)
1. **用戶回訪**：用戶進入 Dashboard。
2. **數據獲取**：Server Component 讀取 DB，顯示已完成的筆記列表。
3. **雙欄校對 (Split Editor)**：用戶點擊筆記，左側看原圖 (支援縮放)，右側編輯 Markdown (支援即時預覽)。

***

## 4. 資料庫模型設計 (Schema Design)
使用 Prisma 定義，確保資料關聯性。

*(參考 `prisma/schema.prisma` 實作檔案)*

***

## 5. 前端設計規範 (Design System: Digital Zen)
結合「frontend-design」與「ui-ux-pro-max」技能，採用 "Digital Zen" 設計語言。

* **核心風格 (Tone)**: **Organic & Refined (有機與精緻)**。結合傳統紙張的質感與現代科技的俐落。
* **色彩系統 (Colors)**: 
    * `Stone`: 暖灰基底，減少視覺疲勞。
    * `Paper White`: 內容區塊背景。
    * `Ink Black`: 文字主要顏色。
    * `Accent`: 來自 "AI" 的螢光提示色 (用於標籤或狀態)。
* **排版 (Typography)**: 
    * 標題：襯線體 (Serif) - 營造閱讀筆記的經典感。
    * 內文：無襯線體 (Sans) - 確保數位閱讀的清晰度。
* **佈局 (Layout)**: 
    * **AppSidebar**: 全局左側導航。
    * **Split View**: 核心編輯體驗，左圖右文。

***

## 6. 功能詳情 (Detailed Features)

以下是「智慧筆記歸檔系統」的功能設計思考，結合了核心目標與您的需求。

#### 1. 輸入與處理 (Ingestion & Processing)
這是系統的起點，確保內容能順暢地進入系統並被智能處理。
*   **批次圖片/PDF 上傳** (✅ 已實作前端批次上傳，後端單次處理，含本地速率限制)
    *   支援多種圖片格式 (JPG, PNG, WEBP) 及 PDF。
    *   支援拖曳上傳、選取檔案。
    *   即時進度顯示與錯誤回報。
*   **AI 多模態內容識別 (OCR + LLM)** (✅ 核心已實作，Gemini 2.0 Flash)
    *   從圖片中提取原始文字 (Raw OCR)。
    *   LLM 語意修正與結構化 (生成 Markdown)。
    *   AI 自動生成摘要 (Summary)。
    *   AI 自動生成相關標籤 (Tags)。
    *   AI 處理信心分數 (Confidence Score)。
*   **錯誤重試與恢復** (✅ 已實作後端 API，前端已整合)
    *   AI 處理失敗時可手動觸發重試。
    *   提供錯誤訊息，指引用戶。
*   **去重機制** (❌ 規劃中)
    *   上傳時檢測檔案內容是否重複，避免重複歸檔。
    *   提示用戶或自動合併。

#### 2. 組織與管理 (Organization & Management)
確保用戶能高效地組織、查找和管理其數位筆記。
*   **多層級知識庫/資料夾 (Collection)** (⚙️ 資料庫 Schema 已有，前端介面待實作)
    *   建立、編輯、刪除資料夾。
    *   將筆記歸類到特定資料夾。
    *   拖曳移動筆記至不同資料夾。
*   **標籤管理 (Tags)** (✅ AI 已生成，前端介面待強化)
    *   AI 自動生成的標籤可編輯。
    *   用戶可手動新增、刪除、編輯標籤。
    *   標籤雲或標籤列表，點擊可篩選。
*   **強大搜尋功能** (❌ 規劃中)
    *   全文檢索 (搜索筆記內容、摘要、標籤)。
    *   按時間、狀態、資料夾、標籤進行篩選。
    *   支援模糊搜尋。
*   **筆記狀態管理** (✅ 已實作，PENDING, PROCESSING, COMPLETED, FAILED)
    *   在介面清晰顯示每則筆記的處理狀態。

#### 3. 檢視與編輯 (Viewing & Editing)
提供最佳的閱讀、校對和修改體驗。
*   **雙欄校對編輯器 (Split Editor)** (✅ 核心已實作)
    *   左側：原始圖片檢視器 (支援縮放、平移)。
    *   右側：Markdown 預覽與編輯器 (支援即時預覽)。
*   **原文對照校準模式 (Calibration Mode)** (❌ 規劃中，核心難點)
    *   **關鍵功能**：點擊 Markdown 內容時，原始圖片自動定位並高亮對應的文字區域。
    *   反之，框選圖片區域，Markdown 自動高亮對應文字。
*   **筆記內容編輯** (✅ 已實作 Markdown 編輯，可儲存變更至資料庫)
    *   編輯 Markdown 後可儲存變更至資料庫。
    *   Markdown 編輯器應提供基本格式工具欄。
*   **閱讀模式** (❌ 規劃中)
    *   提供一個無干擾的純閱讀介面。
*   **多筆記合併** (❌ 規劃中)
    *   選擇多張筆記，將其內容按順序合併為一份新的 Markdown 文檔。

#### 4. 智慧強化與互動 (AI Enhancements & Interactions)
利用 AI 進一步提升筆記的價值。
*   **AI 摘要與自動命名** (✅ 已實作摘要與自動命名，需優化繁體中文輸出)
    *   AI 自動生成筆記標題 (從摘要中提取或獨立生成)。
    *   可基於摘要快速瀏覽內容。
*   **AI 智能建議** (⏳ 未來規劃)
    *   建議相關筆記、建議歸檔資料夾。
    *   基於內容推薦閱讀材料。
*   **與 AI 對話** (⏳ 未來規劃)
    *   可直接針對單一筆記內容提問，讓 AI 進行解釋、擴展或總結。

#### 5. 系統級功能 (System Level)
保障系統的穩定性、可用性和擴展性。
*   **多用戶支援** (⚙️ 資料庫 Schema 已預留 `userId`)
    *   用戶登入/註冊。
    *   個人化筆記空間。
*   **匯出與分享** (❌ 規劃中)
    *   將筆記匯出為 Markdown、PDF、純文字。
    *   生成可分享的唯讀連結。
*   **響應式設計** (✅ 已實作初步佈局)
    *   確保在手機、平板和電腦上都有良好的體驗。

***

## 9. 功能模組開發清單與狀態

### A. 基礎建設 (Infrastructure)
- [x] **Project Init**: Next.js 15, TypeScript, Tailwind v4。
- [x] **DB Service**: Prisma + SQLite 初始化完成。
- [x] **AI Core**: Google Gemini 2.0 Flash 串接完成 (`src/lib/gemini.ts`)。
- [x] **Testing**: End-to-End 流程測試通過 (`scripts/test-pipeline.ts`)。

### B. 核心功能 (Core Features)
- [x] **Upload Action**: 處理圖片上傳與資料庫寫入。
- [x] **AI Integration**: 將測試過的 AI 腳本整合進 Next.js API Route。
- [x] **Note Content Saving**: 筆記內容編輯與儲存。
- [ ] **Calibration Mode**: 實作「原文對照」與「手動校正」功能。

### C. 前端介面 (UI Components)
- [x] **UI Lib**: shadcn/ui 安裝完成 (Sidebar, Button, Input, etc.)。
- [x] **AppLayout**: 實作數位禪意風格的主佈局。
- [x] **UploadZone**: 支援拖曳、預覽的互動區塊 (含批次上傳)。
- [x] **Dashboard**: 筆記列表與狀態管理 (即時刷新)。
- [x] **SplitEditor**: 雙欄校對編輯器 (含編輯儲存)。
- [x] **All Notes Page**: 所有筆記列表頁面 (含批次刪除)。

***

## 10. 開發流程建議 (Roadmap)
1. **Phase 1: 骨架搭建 (已完成)**
   * 專案初始化、DB 建置、AI 核心測試。
2. **Phase 2: 前端實作 (進行中)**
   * 實作 AppSidebar, Dashboard, UploadZone。
   * 確認 UI 風格符合 "Digital Zen"。
3. **Phase 3: 整合與互動**
   * 串接前端上傳至後端 AI 處理。
   * 實作即時狀態更新。
4. **Phase 4: 優化與完善**
   * 引入校對模式 (Calibration)。
   * 增加搜尋、分類、標籤管理。

這份規劃書將隨著開發進度持續更新，作為專案進化的依據。
