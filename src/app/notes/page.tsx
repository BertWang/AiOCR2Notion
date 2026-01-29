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
      {/* Header Area */}
      <header className="px-8 py-6 pb-2 border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-1">所有筆記</h2>
        <p className="text-stone-500 font-sans">在此檢視、搜尋與管理您的所有數位筆記。</p>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-6 flex flex-col gap-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
        {allNotes.length === 0 ? (
          <div className="text-center py-12 bg-stone-100/50 rounded-xl border border-dashed border-stone-200">
            <p className="text-stone-400 text-sm">目前沒有任何筆記。點擊左側導航的「儀表板」上傳第一張圖片吧！</p>
             <Link href="/">
                <button className="mt-6 group flex items-center justify-center gap-2 bg-stone-900 text-stone-50 py-2.5 px-6 rounded-md hover:bg-stone-800 active:scale-[0.98] transition-all shadow-sm hover:shadow-md">
                    <PlusCircle className="w-4 h-4 text-stone-400 group-hover:text-white transition-colors" />
                    <span className="text-sm font-medium">前往儀表板上傳</span>
                </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allNotes.map((note) => (
              <Link key={note.id} href={`/notes/${note.id}`}>
                <div className="group relative bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-400 hover:shadow-lg transition-all cursor-pointer h-full flex flex-col">
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
