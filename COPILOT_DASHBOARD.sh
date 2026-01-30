#!/usr/bin/env bash
# 📊 Copilot 監督儀表板
# 實時監控 Clawdbot 的進度

clear

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          🤖 Clawdbot 開發進度監督儀表板                        ║"
echo "║                  由 GitHub Copilot 主控                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 系統信息
echo "📊 系統狀態"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "時間: $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo "分支: $(git rev-parse --abbrev-ref HEAD)"
echo "提交: $(git rev-parse --short HEAD)"
echo "狀態: $(git status --porcelain | wc -l) 個變更"
echo ""

# 進度檢查
echo "🎯 當前任務進度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 檢查分支
if git rev-parse feature/search-suggestions-ui >/dev/null 2>&1; then
    echo "✅ 分支已創建: feature/search-suggestions-ui"
    
    # 檢查提交
    COMMIT_COUNT=$(git rev-list --count feature/search-suggestions-ui..main)
    if [ "$COMMIT_COUNT" -eq "0" ]; then
        echo "⏳ 還未有新提交"
    else
        echo "✅ 新提交: $(git log feature/search-suggestions-ui..main --oneline | wc -l)"
        echo "   $(git log feature/search-suggestions-ui -1 --oneline)"
    fi
    
    # 檢查文件變更
    MODIFIED=$(git diff main feature/search-suggestions-ui --name-only 2>/dev/null | wc -l)
    if [ "$MODIFIED" -gt "0" ]; then
        echo "✅ 修改文件: $MODIFIED"
        echo "   $(git diff main feature/search-suggestions-ui --name-only | head -3 | sed 's/^/   /')"
    else
        echo "⏳ 尚無文件修改"
    fi
else
    echo "⏳ 功能分支尚未創建"
    echo "   Clawdbot 應執行: git checkout -b feature/search-suggestions-ui"
fi

echo ""

# 代碼質量檢查
echo "🔍 代碼質量檢查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 構建檢查
if npm run build >/dev/null 2>&1; then
    echo "✅ 構建: 成功"
else
    echo "❌ 構建: 失敗"
    echo "   運行 'npm run build' 查看詳細錯誤"
fi

# lint 檢查
if npm run lint >/dev/null 2>&1; then
    echo "✅ ESLint: 通過"
else
    echo "⚠️  ESLint: 有警告或錯誤"
    echo "   運行 'npm run lint' 查看詳細信息"
fi

# TypeScript 檢查
if npm run tsc --noEmit >/dev/null 2>&1; then
    echo "✅ TypeScript: 無錯誤"
else
    echo "❌ TypeScript: 有錯誤"
    echo "   運行 'npm run tsc --noEmit' 查看詳細信息"
fi

echo ""

# 關鍵文件檢查
echo "📁 關鍵文件監控"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# SearchSuggestions 組件
if [ -f "src/components/search-suggestions.tsx" ]; then
    LINES=$(wc -l < src/components/search-suggestions.tsx)
    echo "✅ SearchSuggestions.tsx: $LINES 行"
else
    echo "⏳ SearchSuggestions.tsx: 未創建"
fi

# SearchBar 更新
if grep -q "SearchSuggestions" src/components/search-bar.tsx 2>/dev/null; then
    echo "✅ SearchBar.tsx: 已整合 SearchSuggestions"
else
    echo "⏳ SearchBar.tsx: 尚未整合"
fi

# API 端點
if grep -q "search/suggestions" src/app/api/search/suggestions/route.ts 2>/dev/null; then
    echo "✅ API 端點: /api/search/suggestions 可用"
else
    echo "❌ API 端點: 未找到"
fi

echo ""

# 測試檢查
echo "🧪 測試和驗證"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TESTS=(
    "3 種建議類型顯示"
    "鍵盤導航 (↑↓Enter Escape)"
    "防抖 API 調用 (300ms)"
    "移動端響應式"
    "TypeScript strict mode"
    "ESLint 檢查通過"
    "構建成功"
)

echo "驗收清單:"
for i in "${!TESTS[@]}"; do
    echo "  [ ] ${TESTS[$i]}"
done

echo ""

# 監督行動
echo "🔔 Copilot 監督行動"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 計算運行時間（如果分支已創建）
if git rev-parse feature/search-suggestions-ui >/dev/null 2>&1; then
    BRANCH_AGE=$(git log -1 --format=%ai feature/search-suggestions-ui | xargs -I {} date -d {} +%s)
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((($CURRENT_TIME - $BRANCH_AGE) / 60))
    
    if [ "$ELAPSED" -lt 30 ]; then
        echo "✅ 狀態: 進行中 (已運行 ${ELAPSED} 分鐘)"
        echo "📌 下一步: 繼續開發"
    elif [ "$ELAPSED" -lt 120 ]; then
        echo "✅ 狀態: 進行中 (已運行 ${ELAPSED} 分鐘)"
        echo "📌 下一步: 進度檢查 - 應該完成 50% 的功能"
    elif [ "$ELAPSED" -lt 210 ]; then
        echo "🟡 狀態: 進行中 (已運行 ${ELAPSED} 分鐘)"
        echo "📌 下一步: 最終檢查 - 應該完成 90% 的功能"
    else
        echo "⚠️  狀態: 超時 (已運行 ${ELAPSED} 分鐘)"
        echo "📌 行動: 檢查進度並提供協助"
    fi
else
    echo "🟡 狀態: 等待中"
    echo "📌 行動: 等待 Clawdbot 簽出分支"
fi

echo ""

# 快速命令
echo "⚡ 快速命令"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "查看進度差異:     git diff main feature/search-suggestions-ui --stat"
echo "查看最新提交:     git log feature/search-suggestions-ui -1"
echo "查看改動文件:     git diff main feature/search-suggestions-ui --name-only"
echo "查看代碼審查:     git show HEAD"
echo "同步分支:         git fetch origin && git rebase origin/main"
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  監督系統已啟動 | 實時監控中 | Clawdbot 狀態: 🟢 準備就緒      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
