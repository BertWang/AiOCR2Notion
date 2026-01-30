#!/bin/bash

# 🚀 Clawdbot 快速開始 - Phase 2.1 搜尋建議 UI
# 直接執行此腳本讓 Clawdbot 開始第一個開發任務

cd /workspaces/TestMoltbot

# 檢查系統狀態
echo "📊 系統檢查..."
npm run build 2>&1 | tail -5

# 創建分支
echo "🌿 建立 feature 分支..."
git checkout -b feature/search-suggestions-ui

# 建立任務指令文件
cat > CLAWDBOT_IMMEDIATE_TASK.md << 'EOF'
# 🎯 Clawdbot 立即任務：搜尋建議 UI (Phase 2.1)

## 優先級：🔴 立即

## 時間估計：3-4 小時

## 開始步驟：

### 1. 創建 SearchSuggestions 組件
文件：`src/components/search-suggestions.tsx`

**功能需求**：
- 顯示建議下拉菜單（最多 10 項）
- 3 種類型：note / tag / quick-search
- 鍵盤導航：↑↓ Enter Escape
- 高亮選中項
- Framer Motion 動畫進入/退出

**基本結構**：
```typescript
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Tag, Zap } from "lucide-react";

interface Suggestion {
  type: "note" | "tag" | "quick-search";
  id: string;
  title: string;
  subtitle?: string;
}

interface SearchSuggestionsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  isOpen: boolean;
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  onHighlight: (index: number) => void;
}

export function SearchSuggestions({
  suggestions,
  isLoading,
  isOpen,
  selectedIndex,
  onSelect,
  onHighlight,
}: SearchSuggestionsProps) {
  // 按類型分組
  const grouped = {
    note: suggestions.filter(s => s.type === "note"),
    tag: suggestions.filter(s => s.type === "tag"),
    quickSearch: suggestions.filter(s => s.type === "quick-search"),
  };

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
      >
        {isLoading && (
          <div className="p-4 text-center text-stone-500 text-sm">
            載入中...
          </div>
        )}

        {grouped.note.length > 0 && (
          <div>
            <div className="px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
              筆記
            </div>
            {grouped.note.map((item, idx) => (
              <SuggestionItem
                key={item.id}
                suggestion={item}
                isSelected={selectedIndex === idx}
                onSelect={onSelect}
                onHighlight={() => onHighlight(idx)}
                icon={<FileText className="w-4 h-4" />}
              />
            ))}
          </div>
        )}

        {grouped.tag.length > 0 && (
          <div>
            <div className="px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
              標籤
            </div>
            {grouped.tag.map((item, idx) => (
              <SuggestionItem
                key={item.id}
                suggestion={item}
                isSelected={selectedIndex === grouped.note.length + idx}
                onSelect={onSelect}
                onHighlight={() => onHighlight(grouped.note.length + idx)}
                icon={<Tag className="w-4 h-4" />}
              />
            ))}
          </div>
        )}

        {grouped.quickSearch.length > 0 && (
          <div>
            <div className="px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
              快速搜尋
            </div>
            {grouped.quickSearch.map((item, idx) => (
              <SuggestionItem
                key={item.id}
                suggestion={item}
                isSelected={
                  selectedIndex ===
                  grouped.note.length + grouped.tag.length + idx
                }
                onSelect={onSelect}
                onHighlight={() =>
                  onHighlight(
                    grouped.note.length + grouped.tag.length + idx
                  )
                }
                icon={<Zap className="w-4 h-4" />}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function SuggestionItem({
  suggestion,
  isSelected,
  onSelect,
  onHighlight,
  icon,
}: {
  suggestion: Suggestion;
  isSelected: boolean;
  onSelect: (suggestion: Suggestion) => void;
  onHighlight: () => void;
  icon: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={() => onSelect(suggestion)}
      onMouseEnter={onHighlight}
      className={`w-full px-4 py-2 text-left flex items-center gap-2 text-sm transition-colors ${
        isSelected
          ? "bg-stone-100 text-stone-900"
          : "hover:bg-stone-50 text-stone-700"
      }`}
      whileHover={{ backgroundColor: "rgb(245 245 244)" }}
    >
      <span className="text-stone-400">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{suggestion.title}</div>
        {suggestion.subtitle && (
          <div className="text-xs text-stone-400 truncate">
            {suggestion.subtitle}
          </div>
        )}
      </div>
    </motion.button>
  );
}
```

### 2. 更新 SearchBar 組件
文件：`src/components/search-bar.tsx`

**需要添加**：
```typescript
// 防抖函數
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 在組件中添加
const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [selectedIndex, setSelectedIndex] = useState(-1);
const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

const fetchSuggestions = async (query: string) => {
  if (query.length < 2) {
    setShowSuggestions(false);
    return;
  }

  setIsLoadingSuggestions(true);
  try {
    const res = await fetch(`/api/search/suggestions?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    setSuggestions(data.suggestions || []);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  } catch (error) {
    console.error("Failed to fetch suggestions", error);
  } finally {
    setIsLoadingSuggestions(false);
  }
};

const debouncedFetch = debounce(fetchSuggestions, 300);

const handleInputChange = (value: string) => {
  setSearchQuery(value);
  debouncedFetch(value);
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (!showSuggestions || suggestions.length === 0) return;

  switch (e.key) {
    case "ArrowUp":
      e.preventDefault();
      setSelectedIndex(prev =>
        prev <= 0 ? suggestions.length - 1 : prev - 1
      );
      break;
    case "ArrowDown":
      e.preventDefault();
      setSelectedIndex(prev =>
        prev >= suggestions.length - 1 ? 0 : prev + 1
      );
      break;
    case "Enter":
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
      break;
    case "Escape":
      setShowSuggestions(false);
      break;
  }
};

const handleSelectSuggestion = (suggestion: Suggestion) => {
  if (suggestion.type === "tag") {
    setSearchQuery(`tag:${suggestion.title}`);
  } else {
    setSearchQuery(suggestion.title);
  }
  setShowSuggestions(false);
  handleSearch();
};
```

### 3. 集成到 SearchBar 的返回值
```typescript
return (
  <div className="relative">
    <div className="flex items-center gap-2 ...">
      <input
        value={searchQuery}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        ...
      />
    </div>
    <SearchSuggestions
      suggestions={suggestions}
      isLoading={isLoadingSuggestions}
      isOpen={showSuggestions}
      selectedIndex={selectedIndex}
      onSelect={handleSelectSuggestion}
      onHighlight={setSelectedIndex}
    />
  </div>
);
```

## 驗收標準

- [ ] SearchSuggestions 組件完成
- [ ] SearchBar 正確集成
- [ ] 鍵盤導航工作正常
- [ ] 防抖工作正常 (300ms)
- [ ] TypeScript 無錯誤
- [ ] ESLint 通過
- [ ] 移動端響應式

## 下一步

完成後提交 PR 並 tag main 分支以供 Copilot 審查。

---

**開始時間**：現在  
**技術棧**：React + TypeScript + Framer Motion + shadcn/ui
EOF

echo "✅ 任務文件已創建：CLAWDBOT_IMMEDIATE_TASK.md"
echo ""
echo "🎯 Clawdbot 下一步："
echo "1. 創建 src/components/search-suggestions.tsx"
echo "2. 更新 src/components/search-bar.tsx"
echo "3. 測試和驗收"
echo "4. 提交 PR"
echo ""
echo "📖 詳細文件已保存到 CLAWDBOT_IMMEDIATE_TASK.md"
echo "⏱️ 預計時間：3-4 小時"
