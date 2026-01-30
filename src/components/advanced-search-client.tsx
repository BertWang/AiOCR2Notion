"use client";

import { useState, useTransition } from "react";
import { Search, X, Loader2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SearchResult {
  id: string;
  imageUrl: string;
  refinedContent: string | null;
  summary: string | null;
  tags: string | null;
  status: string;
  createdAt: Date;
  confidence: number | null;
}

export function AdvancedSearchClient() {
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [confidenceMin, setConfidenceMin] = useState("");
  const [confidenceMax, setConfidenceMax] = useState("");
  const [status, setStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = () => {
    if (!query.trim() && !dateFrom && !dateTo && !confidenceMin && !confidenceMax && status === "all") {
      toast.info("請輸入搜尋條件");
      return;
    }

    startTransition(async () => {
      try {
        const params = new URLSearchParams();
        if (query) params.append("query", query);
        if (dateFrom) params.append("dateFrom", dateFrom);
        if (dateTo) params.append("dateTo", dateTo);
        if (confidenceMin) params.append("confidenceMin", confidenceMin);
        if (confidenceMax) params.append("confidenceMax", confidenceMax);
        if (status !== "all") params.append("status", status);

        const response = await fetch(`/api/search?${params.toString()}`);
        if (!response.ok) throw new Error("搜尋失敗");

        const data: SearchResult[] = await response.json();
        setResults(data);

        if (data.length === 0) {
          toast.info("未找到符合條件的筆記");
        } else {
          toast.success(`找到 ${data.length} 份筆記`);
        }
      } catch (error) {
        console.error("Search error:", error);
        toast.error("搜尋失敗，請稍後重試");
      }
    });
  };

  const handleReset = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setConfidenceMin("");
    setConfidenceMax("");
    setStatus("all");
    setResults([]);
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? `<mark class="bg-yellow-200 font-semibold">${part}</mark>` : part
    ).join("");
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Search Conditions Panel */}
      <div className="px-6 py-4 bg-white border-b border-stone-200 space-y-4">
        {/* Main Search Bar with Helper Text */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="搜尋筆記內容、摘要、標籤..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={isPending}
              className="bg-stone-900 text-white hover:bg-stone-800"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-stone-100")}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-xs text-stone-400 whitespace-nowrap px-2">輸入 2 個字符或以上開始搜尋</span>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
            {/* Date Range */}
            <div>
              <label className="text-xs font-semibold text-stone-600">開始日期</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-600">結束日期</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Confidence Range */}
            <div>
              <label className="text-xs font-semibold text-stone-600">最低信心分數</label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                placeholder="0.0 - 1.0"
                value={confidenceMin}
                onChange={(e) => setConfidenceMin(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-600">最高信心分數</label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                placeholder="0.0 - 1.0"
                value={confidenceMax}
                onChange={(e) => setConfidenceMax(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-semibold text-stone-600">狀態</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 border border-stone-200 rounded text-xs bg-white"
              >
                <option value="all">全部</option>
                <option value="COMPLETED">已完成</option>
                <option value="PROCESSING">處理中</option>
                <option value="FAILED">失敗</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="w-full"
              >
                <X className="w-3 h-3 mr-1" />
                清除篩選
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {results.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-stone-200 flex flex-col items-center justify-center h-full max-w-md mx-auto">
            <Search className="w-12 h-12 text-stone-300 mb-4" />
            <p className="text-stone-500 text-sm font-medium mb-1">
              {isPending ? "搜尋中..." : "尚未搜尋"}
            </p>
            <p className="text-stone-400 text-xs">
              {isPending ? "請稍候..." : "使用上方搜尋欄與篩選條件尋找筆記"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-stone-600 font-semibold mb-4">找到 {results.length} 份筆記</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((note) => (
                <Link key={note.id} href={`/notes/${note.id}`}>
                  <div className="group bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-400 hover:shadow-lg transition-all cursor-pointer h-full flex flex-col">
                    <div className="h-24 bg-stone-100 rounded-lg mb-3 overflow-hidden border border-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={note.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-serif font-bold text-stone-800 line-clamp-1 flex-1">
                        {note.summary ? note.summary.split('。')[0] : '無標題'}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ml-2 shrink-0 ${
                        note.status === 'COMPLETED' ? 'bg-green-500' : 'bg-orange-400'
                      }`}>
                        {note.status === 'COMPLETED' ? '完成' : '中'}
                      </span>
                    </div>

                    {note.confidence !== null && (
                      <div className="text-xs text-stone-500 mb-2">
                        信心分數: {(note.confidence * 100).toFixed(0)}%
                      </div>
                    )}

                    <p className="text-xs text-stone-600 line-clamp-2 mb-3 flex-1">
                      {note.summary || note.refinedContent || "等待 AI 解析中..."}
                    </p>

                    {note.tags && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.split(',').filter(Boolean).slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] text-stone-500 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
