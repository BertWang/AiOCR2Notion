"use client";

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreHorizontal, Trash2, Edit, FolderPlus, MoveRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  notes: { id: string }[];
  children?: Collection[];
}

interface CollectionTreeProps {
  selectedId?: string | null;
  onSelect?: (collection: Collection | null) => void;
  onRefresh?: () => void;
}

export function CollectionTree({ selectedId, onSelect, onRefresh }: CollectionTreeProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [parentForNew, setParentForNew] = useState<string | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // 載入資料夾
  const loadCollections = async () => {
    try {
      const response = await fetch('/api/collections?format=tree');
      if (!response.ok) throw new Error('Failed to load');
      
      const data = await response.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error('Load collections error:', error);
      toast.error('載入資料夾失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  // 切換展開/收合
  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 創建資料夾
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('請輸入資料夾名稱');
      return;
    }

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          parentId: parentForNew,
        }),
      });

      if (!response.ok) throw new Error('Failed to create');

      toast.success('資料夾已創建');
      setShowCreateDialog(false);
      setFormData({ name: '', description: '' });
      setParentForNew(null);
      await loadCollections();
      onRefresh?.();
    } catch (error) {
      console.error('Create error:', error);
      toast.error('創建失敗');
    }
  };

  // 更新資料夾
  const handleUpdate = async () => {
    if (!editingCollection || !formData.name.trim()) return;

    try {
      const response = await fetch(`/api/collections/${editingCollection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      toast.success('資料夾已更新');
      setShowEditDialog(false);
      setEditingCollection(null);
      setFormData({ name: '', description: '' });
      await loadCollections();
      onRefresh?.();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('更新失敗');
    }
  };

  // 刪除資料夾
  const handleDelete = async (collection: Collection) => {
    if (!confirm(`確定要刪除「${collection.name}」嗎？${collection.children?.length ? '子資料夾也會一併刪除。' : ''}`)) {
      return;
    }

    try {
      const response = await fetch(`/api/collections?id=${collection.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('資料夾已刪除');
      await loadCollections();
      onRefresh?.();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('刪除失敗');
    }
  };

  // 渲染樹節點
  const renderNode = (collection: Collection, depth = 0) => {
    const hasChildren = collection.children && collection.children.length > 0;
    const isExpanded = expanded.has(collection.id);
    const isSelected = selectedId === collection.id;
    const noteCount = collection.notes.length;

    return (
      <div key={collection.id}>
        <div
          className={cn(
            "group flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-stone-100 cursor-pointer transition-colors",
            isSelected && "bg-stone-200 hover:bg-stone-200"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(collection.id);
              }}
              className="p-0.5 hover:bg-stone-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-stone-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-stone-500" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Icon */}
          <div
            onClick={() => onSelect?.(collection)}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            {isExpanded && hasChildren ? (
              <FolderOpen className="w-4 h-4 text-stone-500 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-stone-500 shrink-0" />
            )}

            {/* Name */}
            <span className="text-sm text-stone-700 truncate flex-1">
              {collection.name}
            </span>

            {/* Note count */}
            {noteCount > 0 && (
              <span className="text-xs text-stone-400 shrink-0">
                {noteCount}
              </span>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setParentForNew(collection.id);
                  setFormData({ name: '', description: '' });
                  setShowCreateDialog(true);
                }}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                新增子資料夾
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCollection(collection);
                  setFormData({ name: collection.name, description: collection.description || '' });
                  setShowEditDialog(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                重新命名
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(collection);
                }}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                刪除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {collection.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-stone-500 text-sm">
        載入中...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-stone-200">
        <h3 className="text-sm font-semibold text-stone-700">資料夾</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setParentForNew(null);
            setFormData({ name: '', description: '' });
            setShowCreateDialog(true);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* All Notes (Root) */}
          <div
            className={cn(
              "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-stone-100 cursor-pointer transition-colors mb-1",
              selectedId === null && "bg-stone-200 hover:bg-stone-200"
            )}
            onClick={() => onSelect?.(null)}
          >
            <Folder className="w-4 h-4 text-stone-500" />
            <span className="text-sm text-stone-700">所有筆記</span>
          </div>

          {/* Collections Tree */}
          {collections.length === 0 ? (
            <div className="text-center text-stone-400 text-xs py-8">
              尚無資料夾<br />點擊 + 創建第一個
            </div>
          ) : (
            collections.map(col => renderNode(col, 0))
          )}
        </div>
      </ScrollArea>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增資料夾</DialogTitle>
            <DialogDescription>
              {parentForNew ? '在所選資料夾下創建子資料夾' : '創建根層級資料夾'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">資料夾名稱</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：工作筆記"
              />
            </div>
            <div>
              <Label htmlFor="description">描述（選填）</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="簡短說明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>創建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯資料夾</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">資料夾名稱</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">描述</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
