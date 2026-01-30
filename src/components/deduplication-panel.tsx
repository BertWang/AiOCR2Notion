"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle2, Merge, Trash2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Note {
  id: string;
  refinedContent: string | null;
  rawOcrText: string | null;
  summary: string | null;
  imageUrl: string;
}

interface DuplicateGroup {
  groupId: string;
  notes: Note[];
  similarity: number;
  suggestedAction: 'merge' | 'review';
}

interface DeduplicationPanelProps {
  threshold?: number;
  onComplete?: () => void;
}

export function DeduplicationPanel({ threshold = 0.85, onComplete }: DeduplicationPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState<'merge' | 'delete'>('merge');

  // 執行去重檢測
  const detectDuplicates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notes/duplicates?threshold=${threshold}`);
      if (!response.ok) throw new Error('檢測失敗');
      
      const data = await response.json();
      setGroups(data.groups || []);
      setSummary(data.summary || "");
      
      if (data.groups.length === 0) {
        toast.success("太好了！", { description: "未發現重複筆記" });
      } else {
        toast.info("檢測完成", { description: `找到 ${data.groups.length} 組重複` });
      }
    } catch (error) {
      console.error("Duplicate detection error:", error);
      toast.error("檢測失敗", { description: "請稍後再試" });
    } finally {
      setIsLoading(false);
    }
  };

  // 自動執行檢測
  useEffect(() => {
    detectDuplicates();
  }, [threshold]);

  // 切換組選擇
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groups.map(g => g.groupId)));
    }
  };

  // 合併選中的組
  const handleMergeSelected = async () => {
    setIsProcessing(true);
    try {
      const selectedGroupData = groups.filter(g => selectedGroups.has(g.groupId));
      
      let successCount = 0;
      for (const group of selectedGroupData) {
        const noteIds = group.notes.map(n => n.id);
        
        const response = await fetch('/api/notes/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: noteIds }),
        });
        
        if (response.ok) {
          successCount++;
        }
      }
      
      toast.success(`已合併 ${successCount} 組筆記`, {
        description: "頁面將自動刷新"
      });
      
      // 延遲刷新，讓用戶看到成功訊息
      setTimeout(() => {
        onComplete?.();
        detectDuplicates(); // 重新檢測
      }, 1500);
      
    } catch (error) {
      console.error("Merge error:", error);
      toast.error("合併失敗", { description: "請稍後再試" });
    } finally {
      setIsProcessing(false);
      setShowConfirm(false);
    }
  };

  // 刪除選中組的重複筆記（保留每組第一個）
  const handleDeleteSelected = async () => {
    setIsProcessing(true);
    try {
      const selectedGroupData = groups.filter(g => selectedGroups.has(g.groupId));
      
      // 收集要刪除的筆記 ID（每組保留第一個）
      const idsToDelete: string[] = [];
      selectedGroupData.forEach(group => {
        idsToDelete.push(...group.notes.slice(1).map(n => n.id));
      });
      
      const response = await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      });
      
      if (!response.ok) throw new Error('刪除失敗');
      
      toast.success(`已刪除 ${idsToDelete.length} 份重複筆記`, {
        description: "已保留每組的第一份筆記"
      });
      
      setTimeout(() => {
        onComplete?.();
        detectDuplicates();
      }, 1500);
      
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("刪除失敗", { description: "請稍後再試" });
    } finally {
      setIsProcessing(false);
      setShowConfirm(false);
    }
  };

  const handleAction = (action: 'merge' | 'delete') => {
    setActionType(action);
    setShowConfirm(true);
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
        <p className="text-stone-500 text-sm">正在分析筆記相似度...</p>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <div className="text-center">
          <p className="text-stone-700 font-medium mb-1">未發現重複筆記</p>
          <p className="text-stone-500 text-sm">{summary}</p>
        </div>
        <Button variant="outline" size="sm" onClick={detectDuplicates}>
          重新檢測
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-orange-50 border-orange-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-orange-900 mb-1">發現重複內容</p>
            <p className="text-sm text-orange-700">{summary}</p>
          </div>
        </div>
      </Card>

      {/* Actions Bar */}
      {groups.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {selectedGroups.size === groups.length ? '取消全選' : '全選'}
            </Button>
            <span className="text-sm text-stone-500">
              {selectedGroups.size > 0 ? `已選 ${selectedGroups.size} 組` : `共 ${groups.length} 組`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleAction('merge')}
              disabled={selectedGroups.size === 0 || isProcessing}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Merge className="w-4 h-4 mr-2" />}
              合併選中
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleAction('delete')}
              disabled={selectedGroups.size === 0 || isProcessing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              刪除重複
            </Button>
          </div>
        </div>
      )}

      {/* Groups List */}
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {groups.map((group, idx) => (
            <Card
              key={group.groupId}
              className={`p-4 cursor-pointer transition-all ${
                selectedGroups.has(group.groupId)
                  ? 'border-stone-400 shadow-md ring-2 ring-stone-300'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
              onClick={() => toggleGroupSelection(group.groupId)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      組 {idx + 1}
                    </Badge>
                    <Badge
                      variant={group.similarity > 0.95 ? 'destructive' : 'default'}
                      className="text-xs"
                    >
                      {(group.similarity * 100).toFixed(1)}% 相似
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs"
                    >
                      {group.notes.length} 份筆記
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 bg-stone-50 rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors"
                      >
                        <div className="flex gap-3">
                          {/* Thumbnail */}
                          <div className="w-16 h-16 bg-stone-200 rounded shrink-0 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={note.imageUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 line-clamp-2 mb-1">
                              {note.summary || '無標題'}
                            </p>
                            <Link
                              href={`/notes/${note.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              查看詳情
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'merge' ? '確認合併' : '確認刪除'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'merge'
                ? `即將合併 ${selectedGroups.size} 組筆記，每組的內容將整合為一份新筆記。`
                : `即將刪除 ${selectedGroups.size} 組中的重複筆記，每組保留第一份筆記。此操作無法復原。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={actionType === 'merge' ? handleMergeSelected : handleDeleteSelected}
              disabled={isProcessing}
              className={actionType === 'delete' ? 'bg-red-500 hover:bg-red-600' : ''}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              確認{actionType === 'merge' ? '合併' : '刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
