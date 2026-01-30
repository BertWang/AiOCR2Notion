"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Clock, Tag, TrendingUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface SearchSuggestionsProps {
  query: string;
  isOpen: boolean;
  onSelectSuggestion: (suggestion: string) => void;
  onClose: () => void;
  selectedIndex: number;
  onKeyNavigate: (direction: "up" | "down") => void;
}

interface SuggestionsData {
  suggestions: string[];
  popularTags: string[];
}

interface HistoryItem {
  id: string;
  query: string;
  resultCount: number;
  createdAt: string;
}

export function SearchSuggestions({
  query,
  isOpen,
  onSelectSuggestion,
  onClose,
  selectedIndex,
  onKeyNavigate,
}: SearchSuggestionsProps) {
  const [suggestionsData, setSuggestionsData] = useState<SuggestionsData>({
    suggestions: [],
    popularTags: [],
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 獲取搜尋建議
  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/search/suggestions");
      if (!response.ok) {
        throw new Error("無法獲取建議");
      }
      const data: SuggestionsData = await response.json();
      setSuggestionsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知錯誤");
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 獲取搜尋歷史
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/search/history?limit=5");
      if (!response.ok) {
        throw new Error("無法獲取歷史");
      }
      const data = await response.json();
      setHistory(data.data || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, []);

  // 當組件打開時獲取建議和歷史
  useEffect(() => {
    if (isOpen) {
      if (suggestionsData.suggestions.length === 0) {
        fetchSuggestions();
      }
      if (history.length === 0) {
        fetchHistory();
      }
    }
  }, [isOpen, fetchSuggestions, fetchHistory, suggestionsData.suggestions.length, history.length]);

  // 點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // 刪除歷史項
  const handleDeleteHistory = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const response = await fetch(`/api/search/history?id=${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("無法刪除歷史");
        }

        setHistory((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error("Failed to delete history:", err);
      }
    },
    []
  );

  // 根據輸入查詢過濾建議
  const filteredSuggestions = query.trim()
    ? suggestionsData.suggestions.filter((s) =>
        s.toLowerCase().includes(query.toLowerCase())
      )
    : suggestionsData.suggestions;

  // 熱門標籤（僅在沒有查詢時顯示）
  const showPopularTags = !query.trim() && suggestionsData.popularTags.length > 0;

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
      role="listbox"
      aria-label="搜尋建議"
    >
      {isLoading && (
        <div className="p-4 text-center text-stone-500 text-sm">
          載入建議中...
        </div>
      )}

      {error && (
        <div className="p-4 text-center text-red-500 text-sm">{error}</div>
      )}

      {!isLoading && !error && (
        <>
          {/* 搜尋歷史 (無查詢時顯示) */}
          {!query.trim() && history.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-3 h-3" />
                搜尋歷史
              </div>
              <div className="space-y-1">
                {history.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-stone-50 transition-colors group"
                  >
                    <button
                      onClick={() => onSelectSuggestion(item.query)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-stone-700 truncate">
                          {item.query}
                        </span>
                        {item.resultCount > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded whitespace-nowrap">
                            {item.resultCount}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-400 mt-1">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          locale: zhCN,
                          addSuffix: true,
                        })}
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleDeleteHistory(item.id, e)}
                      className="text-stone-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 過濾後的建議列表 */}
          {filteredSuggestions.length > 0 && (
            <div className={cn("py-2", history.length > 0 && !query.trim() && "border-t border-stone-100")}>
              <div className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                建議搜尋
              </div>
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  role="option"
                  aria-selected={selectedIndex === index}
                  onClick={() => onSelectSuggestion(suggestion)}
                  onMouseEnter={() => {
                    // 當滑鼠懸停時，更新選中索引
                    if (selectedIndex !== index) {
                      onKeyNavigate("down"); // 簡單實現：每次懸停都導航
                    }
                  }}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm hover:bg-stone-50 transition-colors flex items-center gap-2",
                    selectedIndex === index && "bg-stone-100"
                  )}
                >
                  <TrendingUp className="w-4 h-4 text-stone-400" />
                  <span className="flex-1 truncate">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* 熱門標籤 */}
          {showPopularTags && (
            <div className={cn("py-2", (filteredSuggestions.length > 0 || history.length > 0) && "border-t border-stone-100")}>
              <div className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-2">
                <Tag className="w-3 h-3" />
                熱門標籤
              </div>
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {suggestionsData.popularTags.map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectSuggestion(tag)}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 空狀態 */}
          {filteredSuggestions.length === 0 && !showPopularTags && history.length === 0 && (
            <div className="p-4 text-center text-stone-500 text-sm">
              沒有相關建議
            </div>
          )}
        </>
      )}
    </div>
  );
}
