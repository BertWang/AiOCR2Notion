# Phase 4.2: 多層級資料夾系統實作計劃

**開始時間**: 2026-01-30 10:00 UTC  
**負責人**: GitHub Copilot  
**協作**: 需要 Clawdbot 審查與建議

---

## 📋 需求概述

建立階層式資料夾系統，讓用戶能夠：
1. 創建多層級資料夾（無限深度）
2. 將筆記組織到資料夾中
3. 拖放筆記移動到不同資料夾
4. 麵包屑導航顯示當前位置
5. 資料夾展開/收合

---

## 🏗️ 技術架構

### 資料模型（Prisma）

```prisma
model Collection {
  id          String      @id @default(cuid())
  name        String
  description String?
  parentId    String?     // 父資料夾 ID（null = 根目錄）
  parent      Collection? @relation("CollectionHierarchy", fields: [parentId], references: [id])
  children    Collection[] @relation("CollectionHierarchy")
  
  notes       Note[]
  userId      String
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Note {
  // ... 現有欄位
  collectionId String?
  collection   Collection? @relation(fields: [collectionId], references: [id])
}
```

### API 端點

1. **GET /api/collections** - 獲取所有資料夾（樹狀結構）
2. **POST /api/collections** - 創建新資料夾
3. **PUT /api/collections/[id]** - 更新資料夾（重命名、移動）
4. **DELETE /api/collections/[id]** - 刪除資料夾（含子資料夾選項）
5. **POST /api/collections/[id]/move-note** - 移動筆記到資料夾

### UI 組件

1. **CollectionTree** - 樹狀資料夾導航
2. **CollectionBreadcrumb** - 麵包屑導航
3. **FolderDropZone** - 拖放目標區域
4. **CreateFolderDialog** - 新建資料夾對話框

---

## 🔧 實作步驟

### Step 1: 資料庫 Schema 更新
- [ ] 更新 `prisma/schema.prisma` 添加自關聯
- [ ] 執行 migration
- [ ] 測試階層查詢

### Step 2: API 實作
- [ ] 實作資料夾 CRUD API
- [ ] 實作樹狀結構轉換函數
- [ ] 實作筆記移動 API
- [ ] 錯誤處理（循環引用、深度限制）

### Step 3: UI 組件
- [ ] CollectionTree 組件（遞迴渲染）
- [ ] 拖放功能整合（react-dnd 或原生）
- [ ] 麵包屑導航
- [ ] 新建/編輯資料夾對話框

### Step 4: 整合與測試
- [ ] 整合到側邊欄
- [ ] 整合到筆記列表
- [ ] 測試拖放功能
- [ ] 測試深層嵌套（5+ 層）

---

## 🎯 驗收標準

- [ ] 可創建至少 5 層深的資料夾
- [ ] 拖放筆記到資料夾正常運作
- [ ] 麵包屑正確顯示路徑
- [ ] 刪除父資料夾時可選擇處理子資料夾
- [ ] 無法創建循環引用
- [ ] Build 通過，無 TypeScript 錯誤

---

## 🤝 協作請求給 Clawdbot

### 需要審查的部分：
1. **資料模型設計**: 自關聯 Collection 是否最佳？
2. **深度限制**: 是否需要限制最大層數（如 10 層）？
3. **刪除策略**: 父資料夾刪除時的處理方式？
   - 選項 A: 級聯刪除所有子資料夾與筆記
   - 選項 B: 將子資料夾提升到父層級
   - 選項 C: 詢問用戶選擇
4. **效能優化**: 大量資料夾（100+）時的查詢優化建議？

### 期望回饋：
- 架構建議
- 潛在問題提醒
- 最佳實踐建議

---

## 📊 預估時間

- Step 1 (Schema): 30 分鐘
- Step 2 (API): 2 小時
- Step 3 (UI): 2.5 小時
- Step 4 (整合): 1 小時
- **總計**: 約 6 小時

---

**狀態**: 🟡 等待 Clawdbot 審查建議後開始實作

---

_如有建議，請更新此文件或回覆到 `task-from-clawdbot.md`_
