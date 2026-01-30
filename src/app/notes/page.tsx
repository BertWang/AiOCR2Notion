import { NotesListClient } from "@/components/notes-list-client";
import { SearchBar } from "@/components/search-bar";
import { DeduplicationPanel } from "@/components/deduplication-panel";
import { CollectionBreadcrumb } from "@/components/collection-breadcrumb";
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { FileText, Image as ImageIcon, PlusCircle, Folder } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = 'force-dynamic';

export default async function AllNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string }>;
}) {
  const params = await searchParams;
  const collectionId = params.collection;

  // 根據資料夾ID篩選筆記
  const where = collectionId ? { collectionId } : {};
  
  const allNotes = await prisma.note.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // 取得麵包屑與當前資料夾資訊
  const breadcrumbs: { id: string; name: string }[] = [];
  let collectionName = null;

  if (collectionId) {
    let currentId: string | null = collectionId;
    
    // 向上追溯路徑
    while (currentId) {
      const col: { id: string; name: string; parentId: string | null } | null = await prisma.collection.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true }
      });
      
      if (!col) break;
      
      breadcrumbs.unshift({ id: col.id, name: col.name });
      
      // 如果是用戶請求的當前資料夾，記錄名稱
      if (col.id === collectionId) {
        collectionName = col.name;
      }
      
      currentId = col.parentId;
      
      // 防止過深或無限迴圈 (安全閥)
      if (breadcrumbs.length > 20) break;
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-50/30 overflow-hidden">
      {/* Sticky Header Area */}
      <header className="sticky top-0 z-30 px-8 py-4 border-b border-stone-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mb-3">
          {breadcrumbs.length > 0 && (
            <div className="mb-2">
                <CollectionBreadcrumb items={breadcrumbs} />
            </div>
          )}
          <h2 className="text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
            {collectionName ? (
              <>
                <Folder className="w-6 h-6 text-stone-600" />
                {collectionName}
              </>
            ) : (
              '所有筆記'
            )}
          </h2>
          <p className="text-xs text-stone-500 font-sans mt-0.5">
            {collectionName 
              ? `顯示資料夾「${collectionName}」的筆記 (共 ${allNotes.length} 份)`
              : `管理、搜尋與整理您的所有數位筆記 (共 ${allNotes.length} 份)`
            }
          </p>
        </div>
        
        {/* 搜尋欄 */}
        <SearchBar />
      </header>

      {/* Tabs for Notes List and Deduplication */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="notes" className="h-full flex flex-col">
          <div className="px-8 pt-4 border-b border-stone-200 bg-white/50">
            <TabsList className="bg-stone-100">
              <TabsTrigger value="notes">
                <FileText className="w-4 h-4 mr-2" />
                筆記列表
              </TabsTrigger>
              <TabsTrigger value="duplicates">
                <ImageIcon className="w-4 h-4 mr-2" />
                去重管理
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="notes" className="flex-1 overflow-hidden m-0">
            <NotesListClient allNotes={allNotes} />
          </TabsContent>

          <TabsContent value="duplicates" className="flex-1 overflow-auto m-0 p-8">
            <DeduplicationPanel threshold={0.85} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}