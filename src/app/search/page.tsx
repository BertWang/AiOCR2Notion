import { AdvancedSearchClient } from "@/components/advanced-search-client";

export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  return (
    <div className="flex-1 flex flex-col h-full bg-stone-50/30 overflow-hidden">
      <header className="sticky top-0 z-30 px-8 py-4 border-b border-stone-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-900">進階搜尋</h2>
          <p className="text-xs text-stone-500 font-sans mt-0.5">使用多條件篩選與搜尋您的筆記</p>
        </div>
      </header>

      <AdvancedSearchClient />
    </div>
  );
}
