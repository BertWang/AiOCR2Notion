"use client";

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { FileText, Image as ImageIcon, PlusCircle, Trash2, Loader2, Check, Download, FileStack, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  imageUrl: string;
  refinedContent: string | null;
  rawOcrText: string | null;
  summary: string | null;
  tags: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export function NotesListClient({ allNotes }: { allNotes: Note[] }) {
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // 聚合所有标签与计算标签过滤后的笔记
  const { allTags, filteredNotes } = useMemo(() => {
    const tagSet = new Set<string>();
    allNotes.forEach(note => {
      if (note.tags) {
        note.tags.split(',').forEach(tag => tagSet.add(tag.trim()));
      }
    });
    const tags = Array.from(tagSet).sort();
    const filtered = selectedTag
      ? allNotes.filter(n => n.tags?.includes(selectedTag))
      : allNotes;
    return { allTags: tags, filteredNotes: filtered };
  }, [allNotes, selectedTag]);

  const toggleSelect = (noteId: string) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedNotes.size === filteredNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(filteredNotes.map(note => note.id)));
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedNotes) }),
      });

      if (!response.ok) {
        throw new Error('批次刪除失敗');
      }

      toast.success(`已刪除 ${selectedNotes.size} 份筆記`, { description: "資料列表正在更新..." });
      setSelectedNotes(new Set());
      startTransition(() => {
        router.refresh();
      });

    } catch (e) {
      console.error("Error deleting notes:", e);
      toast.error("批次刪除失敗", { description: "請檢查網路或稍後再試" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMergeSelected = async () => {
    setIsMerging(true);
    try {
        const response = await fetch('/api/notes/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedNotes) }),
        });

        if (!response.ok) throw new Error('合併失敗');

        toast.success("筆記已合併", { description: `${selectedNotes.size} 份筆記已整合` });
        setSelectedNotes(new Set());
        startTransition(() => {
            router.refresh();
        });
    } catch (e) {
        console.error("Merge error:", e);
        toast.error("合併失敗", { description: "請稍後再試" });
    } finally {
        setIsMerging(false);
    }
  };

  const handleExportSelected = () => {
    setIsExporting(true);
    try {
        const selectedIds = new Set(selectedNotes);
        const notesToExport = allNotes
            .filter(n => selectedIds.has(n.id))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // 按時間排序

        let exportContent = "";
        notesToExport.forEach(note => {
            exportContent += `# ${note.summary || 'Untitled Note'}\n\n`;
            exportContent += `> Tags: ${note.tags || 'None'}\n\n`;
            exportContent += `${note.refinedContent || note.rawOcrText || '(No Content)'}\n\n`;
            exportContent += `---\n\n`;
        });

        const blob = new Blob([exportContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exported-notes-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("匯出成功", { description: "已開始下載 Markdown 檔案" });
    } catch (e) {
        console.error("Export error:", e);
        toast.error("匯出失敗");
    } finally {
        setIsExporting(false);
    }
  };

  const hasSelected = selectedNotes.size > 0;
  const allSelected = selectedNotes.size === filteredNotes.length && filteredNotes.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-50/30 overflow-hidden">
      {/* Sticky Batch Actions Bar */}
      {filteredNotes.length > 0 && (
        <div className="sticky top-0 z-20 px-6 py-3 bg-white border-b border-stone-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Checkbox 
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              id="select-all-notes"
              className="h-5 w-5"
            />
            <label htmlFor="select-all-notes" className="text-sm font-medium text-stone-700 select-none">
              {hasSelected ? `已選取 ${selectedNotes.size}/${filteredNotes.length}` : `全選 (${filteredNotes.length})`}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleMergeSelected}
                disabled={!hasSelected || isMerging || isDeleting || selectedNotes.size < 2}
                className="hidden md:flex"
            >
                {isMerging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileStack className="w-4 h-4 mr-2" />}
                合併 ({selectedNotes.size})
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={handleExportSelected}
                disabled={!hasSelected || isExporting || isDeleting}
                className="hidden md:flex"
            >
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                匯出 Markdown
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  disabled={!hasSelected || isDeleting}
                  className="transition-all duration-200 ease-in-out"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  刪除 ({selectedNotes.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>確定要刪除這些筆記嗎？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作將會永久刪除所有選取的 {selectedNotes.size} 份筆記及其相關圖片檔案，且無法復原。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    確認刪除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {filteredNotes.length === 0 && !selectedTag ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-stone-200 flex flex-col items-center justify-center h-full max-w-md mx-auto">
          <FileText className="w-12 h-12 text-stone-300 mb-4" />
          <p className="text-stone-500 text-sm font-medium mb-1">目前沒有任何筆記</p>
          <p className="text-stone-400 text-xs mb-6">點擊下方按鈕上傳第一張圖片開始</p>
          <Link href="/">
            <button className="group flex items-center justify-center gap-2 bg-stone-900 text-stone-50 py-2 px-4 rounded-md hover:bg-stone-800 active:scale-[0.98] transition-all shadow-sm hover:shadow-md text-sm">
              <PlusCircle className="w-4 h-4" />
              <span>前往儀表板</span>
            </button>
          </Link>
        </div>
      ) : filteredNotes.length === 0 && selectedTag ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200 flex flex-col items-center justify-center h-full max-w-md mx-auto">
          <Tag className="w-12 h-12 text-stone-300 mb-4" />
          <p className="text-stone-500 text-sm font-medium mb-1">未找到標籤筆記</p>
          <p className="text-stone-400 text-xs mb-6">標籤「{selectedTag}」沒有相關筆記</p>
          <Button size="sm" onClick={() => setSelectedTag(null)} className="text-sm">清除篩選</Button>
        </div>
      ) : (
        <>
          {/* Tag Filter Pills */}
          {allTags.length > 0 && (
            <div className="mb-6 pb-4 border-b border-stone-200">
            <p className="text-xs font-semibold text-stone-600 mb-2">按標籤篩選</p>
            <div className="flex flex-wrap gap-2">
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="px-3 py-1 text-xs font-medium text-white bg-stone-900 rounded-full hover:bg-stone-800 transition-colors"
                >
                  ✕ 全部
                </button>
              )}
              {allTags.map(tag => {
                const count = allNotes.filter(n => n.tags?.includes(tag)).length;
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                      isSelected
                        ? 'text-white bg-stone-700 hover:bg-stone-600'
                        : 'text-stone-600 bg-stone-100 hover:bg-stone-200'
                    )}
                  >
                    #{tag} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredNotes.map((note) => (
            <div 
              key={note.id} 
              className={cn(
                "group relative bg-white border rounded-xl p-4 hover:border-stone-400 hover:shadow-lg transition-all cursor-pointer h-full flex flex-col",
                selectedNotes.has(note.id) ? "border-stone-400 shadow-lg ring-2 ring-stone-300" : "border-stone-200"
              )}
            >
              <div className="absolute top-4 left-4 z-20">
                <Checkbox 
                  checked={selectedNotes.has(note.id)}
                  onCheckedChange={() => toggleSelect(note.id)}
                  id={`select-note-${note.id}`}
                />
              </div>
              <Link href={`/notes/${note.id}`} className="absolute inset-0 z-10" />{/* Overlay Link */}
              
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <span className={`text-[10px] px-2 py-1 rounded-full text-white ${note.status === 'COMPLETED' ? 'bg-green-500' : 'bg-orange-400'}`}>
                  {note.status === 'COMPLETED' ? '已完成' : '處理中'}
                </span>
              </div>
              <div className="h-32 bg-stone-100 rounded-lg mb-4 overflow-hidden relative border border-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={note.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                />
              </div>
              <h4 className="font-serif font-bold text-stone-800 mb-1 line-clamp-1">
                {note.summary ? note.summary.split('。')[0] : '無標題筆記'}
              </h4>
              <p className="text-xs text-stone-500 line-clamp-2 mb-3 flex-1">
                {note.summary || note.refinedContent || "等待 AI 解析中..."}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {note.tags ? note.tags.split(',').filter(Boolean).slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[10px] text-stone-500 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                    #{tag.trim()}
                  </span>
                )) : (
                  <span className="text-[10px] text-stone-300">#未分類</span>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
      </div>
    </div>
  );
}
