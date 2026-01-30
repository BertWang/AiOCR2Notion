import { NotesListClient } from "@/components/notes-list-client";
import { SearchBar } from "@/components/search-bar";
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { FileText, Image as ImageIcon, PlusCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AllNotesPage() {
  const allNotes = await prisma.note.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-50/30 overflow-hidden">
      {/* Sticky Header Area */}
      <header className="sticky top-0 z-30 px-8 py-4 border-b border-stone-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mb-3">
          <h2 className="text-2xl font-serif font-bold text-stone-900">所有筆記</h2>
          <p className="text-xs text-stone-500 font-sans mt-0.5">管理、搜尋與整理您的所有數位筆記</p>
        </div>
        
        {/* 搜尋欄 */}
        <SearchBar />
      </header>

      <NotesListClient allNotes={allNotes} />
    </div>
  );
}