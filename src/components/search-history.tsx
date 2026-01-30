"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trash2, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface HistoryItem {
  id: string;
  query: string;
  resultCount: number;
  createdAt: string;
}

interface SearchHistoryProps {
  onSelectHistory?: (query: string) => void;
  isLoading?: boolean;
}

export function SearchHistory({ onSelectHistory, isLoading = false }: SearchHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 獲取搜尋歷史
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/search/history?limit=10");

      if (!response.ok) {
        throw new Error("Failed to fetch search history");
      }

      const data = await response.json();
      setHistory(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Fetch history error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 刪除單筆歷史
  const handleDeleteItem = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();

      try {
        const response = await fetch(`/api/search/history?id=${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete history item");
        }

        // 更新本地狀態
        setHistory((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error("Delete item error:", err);
        setError("刪除失敗");
      }
    },
    []
  );

  // 清除所有歷史
  const handleClearAll = useCallback(async () => {
    try {
      const response = await fetch("/api/search/history", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear history");
      }

      setHistory([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Clear all error:", err);
      setError("清除失敗");
    }
  }, []);

  // 點擊歷史項恢復搜尋
  const handleSelectHistory = useCallback(
    (query: string) => {
      if (onSelectHistory) {
        onSelectHistory(query);
      }
    },
    [onSelectHistory]
  );

  if (loading && !history.length) {
    return (
      <div className="py-4 px-4 text-center text-sm text-gray-400">
        加載中...
      </div>
    );
  }

  if (error && !history.length) {
    return (
      <div className="py-4 px-4 text-center">
        <AlertCircle className="w-4 h-4 mx-auto mb-2 text-red-400" />
        <div className="text-sm text-red-400">{error}</div>
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="py-4 px-4 text-center text-sm text-gray-400">
        暫無搜尋歷史
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
      {/* 標題和清除按鈕 */}
      <div className="flex items-center justify-between px-4 py-2 mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            搜尋歷史
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            title="清除所有歷史"
          >
            清除
          </button>
        )}
      </div>

      {/* 清除確認對話框 */}
      {showClearConfirm && (
        <div className="px-4 py-2 mb-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300 mb-2">
            確定要清除所有搜尋歷史嗎？
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleClearAll}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              確定
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 歷史列表 */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group transition-colors"
            onClick={() => handleSelectHistory(item.query)}
          >
            {/* 查詢內容 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                {item.query}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(item.createdAt), {
                    locale: zhCN,
                    addSuffix: true,
                  })}
                </span>
                {item.resultCount > 0 && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                    {item.resultCount} 結果
                  </span>
                )}
              </div>
            </div>

            {/* 刪除按鈕 */}
            <button
              onClick={(e) => handleDeleteItem(item.id, e)}
              className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="刪除此項"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
