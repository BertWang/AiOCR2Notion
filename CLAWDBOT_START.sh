#!/usr/bin/env bash
# 🚀 Clawdbot 任務啟動腳本
# 執行此腳本開始 Phase 2.1 開發

echo "🤖 Clawdbot 任務啟動系統"
echo "======================================"
echo ""
echo "📋 您的首個任務: Phase 2.1 - 搜尋建議 UI"
echo ""
echo "⏱️  預計時間: 3-4 小時"
echo "🎯 目標: 實現搜尋建議下拉菜單和 API 整合"
echo ""
echo "======================================"
echo ""

# 檢查工作目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤: 請在項目根目錄執行此腳本"
    exit 1
fi

echo "✅ 步驟 1: 簽出功能分支"
echo "執行命令:"
echo "  git fetch origin"
echo "  git checkout -b feature/search-suggestions-ui"
echo ""

echo "✅ 步驟 2: 查看詳細需求"
echo "執行命令:"
echo "  cat CLAWDBOT_TASKS.md | grep -A 100 'Phase 2.1'"
echo ""

echo "✅ 步驟 3: 創建組件文件"
echo "需要創建:"
echo "  - src/components/search-suggestions.tsx (新文件)"
echo "  - src/components/search-bar.tsx (更新現有)"
echo ""

echo "✅ 步驟 4: 本地開發"
echo "執行命令:"
echo "  npm run dev"
echo "  # 訪問 http://localhost:3001/notes 進行測試"
echo ""

echo "✅ 步驟 5: 品質檢查"
echo "執行命令:"
echo "  npm run lint"
echo "  npm run tsc --noEmit"
echo "  npm run build"
echo ""

echo "✅ 步驟 6: 提交和推送"
echo "執行命令:"
echo "  git add -A"
echo "  git commit -m 'feat: Phase 2.1 - 搜尋建議 UI 實現'"
echo "  git push origin feature/search-suggestions-ui"
echo ""

echo "✅ 步驟 7: 開啟 PR"
echo "在 GitHub 上開啟 PR 到 main 分支"
echo "標題: feat: Phase 2.1 - 搜尋建議 UI 實現"
echo ""

echo "======================================"
echo "📚 參考文件:"
echo "  - CLAWDBOT_TASKS.md (詳細任務描述)"
echo "  - AI_MODULE_MCP_CONFIGURATION.md (系統配置)"
echo "  - COMPLETE_DEVELOPMENT_PLAN.md (開發計劃)"
echo ""

echo "🔍 Copilot 將在以下時間點進行監督:"
echo "  - 0.5h: 分支創建檢查"
echo "  - 2h: 進度中點檢查"
echo "  - 3.5h: 最終審查 + PR 檢查"
echo ""

echo "💡 提示:"
echo "  - 每次提交時包含進度更新"
echo "  - 遇到問題時先查看文檔"
echo "  - 參考現有組件的代碼風格"
echo ""

echo "🚀 準備好了嗎? 開始簽出分支:"
echo "  git fetch origin && git checkout -b feature/search-suggestions-ui"
echo ""

read -p "按 Enter 鍵確認任務分配... " confirm
echo ""
echo "✨ 任務已分配! 祝您開發愉快!"
echo ""
