# 版本資訊系統說明文件

## 概述

TestMoltbot 的版本資訊系統提供自動化的版本追蹤和顯示功能，包括版本號、構建時間、環境類型和 Node 版本等資訊。

---

## 環境變數

### NEXT_PUBLIC_APP_VERSION
- **來源**: `package.json` 的 `version` 欄位
- **時機**: 構建時自動注入
- **用途**: 顯示應用程式版本號
- **格式**: Semantic Versioning (例如: "0.1.0")
- **預設值**: "dev" (開發環境)
- **更新方式**: 執行 `npm version patch|minor|major`

### NEXT_PUBLIC_BUILD_TIME
- **來源**: 構建時的當前時間戳
- **時機**: 每次構建時自動生成
- **用途**: 顯示最後構建時間
- **格式**: ISO 8601 格式 (例如: "2026-01-30T12:00:00Z")
- **預設值**: 當前時間

### NEXT_PUBLIC_NODE_VERSION
- **來源**: 當前 Node.js 版本
- **時機**: 構建時捕獲
- **用途**: 記錄構建時的 Node 版本
- **格式**: 版本字串 (例如: "v24.11.1")
- **預設值**: process.version

### NODE_ENV
- **來源**: 構建環境設定
- **值**: "development" | "production" | "test"
- **用途**: 區分開發、生產和測試環境
- **預設值**: "development"

---

## 檔案結構

```
src/
├── lib/
│   ├── version.ts              # 核心邏輯：版本資訊讀取與驗證
│   └── version.test.ts         # 單元測試
├── components/
│   ├── version-info.tsx        # 展示組件（compact/detailed 模式）
│   ├── version-info-error-boundary.tsx  # 錯誤邊界
│   └── footer.tsx              # 頁腳（包含版本資訊）
```

---

## API 使用

### 基本用法

```typescript
import { getVersionInfo } from '@/lib/version';

const info = getVersionInfo();

console.log(info.version);       // "0.1.0"
console.log(info.buildTime);     // "2026-01-30T12:00:00Z"
console.log(info.environment);   // "production"
console.log(info.nodeVersion);   // "v24.11.1"
console.log(info.isValid);       // true
console.log(info.errors);        // []
```

### 格式化輸出

```typescript
import { formatVersionInfo } from '@/lib/version';

const info = getVersionInfo();
const formatted = formatVersionInfo(info);

console.log(formatted);
// 輸出: "v0.1.0 | production | 2026/1/30"
```

### 驗證資訊

```typescript
const info = getVersionInfo();

if (!info.isValid) {
  console.error('版本資訊驗證失敗:', info.errors);
}
```

---

## 組件使用

### Compact 模式（頁腳）

```tsx
import { VersionInfo } from '@/components/version-info';

export function MyFooter() {
  return (
    <footer>
      <VersionInfo variant="compact" />
    </footer>
  );
}
```

顯示效果：`v0.1.0 | production | 2026/1/30`

### Detailed 模式（設置頁）

```tsx
import { VersionInfo } from '@/components/version-info';

export function SettingsPage() {
  return (
    <div>
      <h2>關於應用程式</h2>
      <VersionInfo variant="detailed" />
    </div>
  );
}
```

顯示效果：完整的資訊卡片，包含複製功能

### 使用錯誤邊界

```tsx
import { VersionInfo } from '@/components/version-info';
import { VersionInfoErrorBoundary } from '@/components/version-info-error-boundary';

export function MyComponent() {
  return (
    <VersionInfoErrorBoundary>
      <VersionInfo variant="compact" />
    </VersionInfoErrorBoundary>
  );
}
```

---

## 版本管理

### 手動更新版本

```bash
# Patch 版本 (0.1.0 → 0.1.1)
npm version patch

# Minor 版本 (0.1.0 → 0.2.0)
npm version minor

# Major 版本 (0.1.0 → 1.0.0)
npm version major
```

### 自動更新流程

1. 執行 `npm version [patch|minor|major]`
2. `package.json` 的 `version` 欄位自動更新
3. Git 自動建立版本 tag
4. 下次構建時，新版本號自動注入到應用程式

---

## 測試

### 執行單元測試

```bash
npm test src/lib/version.test.ts
```

### 測試覆蓋項目

- ✅ 版本資訊欄位完整性
- ✅ 版本號格式驗證
- ✅ 構建時間格式驗證
- ✅ 環境類型驗證
- ✅ 快取機制
- ✅ 格式化功能

---

## 故障排除

### 版本顯示為 "unknown"

**原因**: 環境變數未正確設置

**解決方案**:
1. 檢查 `next.config.ts` 是否正確配置
2. 確認 `package.json` 存在且有 `version` 欄位
3. 重新構建應用程式：`npm run build`

### 構建時間不準確

**原因**: 使用開發伺服器 (`npm run dev`)

**解決方案**:
- 開發環境會使用當前時間
- 生產環境需要執行 `npm run build` 以捕獲正確的構建時間

### 版本驗證失敗

**原因**: 版本號格式不符合 Semantic Versioning

**解決方案**:
1. 確保 `package.json` 中的 `version` 符合 `x.y.z` 格式
2. 或使用 `dev` 作為開發版本標識

---

## 效能考量

### 快取機制

版本資訊在首次讀取後會被快取，避免重複計算：

```typescript
// 第一次調用：計算並快取
const info1 = getVersionInfo();

// 後續調用：直接返回快取
const info2 = getVersionInfo(); // 極快
```

### 構建時注入

環境變數在構建時注入，運行時零成本：

- ✅ 無額外網路請求
- ✅ 無運行時計算
- ✅ 不影響 bundle 大小

---

## 最佳實踐

### 1. 版本號管理
- ✅ 使用 `npm version` 而非手動編輯
- ✅ 遵循 Semantic Versioning
- ✅ 在 Git 中保留版本 tag

### 2. 環境區分
- ✅ 開發環境使用 "dev" 版本
- ✅ 生產環境使用正式版本號
- ✅ 測試環境獨立版本控制

### 3. 錯誤處理
- ✅ 使用 ErrorBoundary 包裹版本組件
- ✅ 驗證環境變數格式
- ✅ 提供降級方案

---

## 未來增強

### 計劃功能
- [ ] 版本更新檢查
- [ ] 變更日誌 (Changelog) 整合
- [ ] 版本比較工具
- [ ] 自動化版本發布流程
- [ ] 國際化 (i18n) 支援

---

## 相關資源

- [Semantic Versioning](https://semver.org/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [npm version](https://docs.npmjs.com/cli/v8/commands/npm-version)

---

**最後更新**: 2026-01-30  
**維護者**: TestMoltbot 團隊
