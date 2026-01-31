import { getRecommendedNotes } from '@/lib/note-correlation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Lightbulb } from 'lucide-react';

interface RelatedNotesSidebarProps {
  noteId: string;
}

/**
 * 相關筆記推薦側邊欄 (Server Component)
 */
export async function RelatedNotesSidebar({ noteId }: RelatedNotesSidebarProps) {
  const recommendedNotes = await getRecommendedNotes(noteId, 5);

  if (recommendedNotes.length === 0) {
    return (
      <div className="p-4 bg-stone-50/50 rounded-lg border border-stone-200 text-center">
        <Lightbulb className="w-5 h-5 text-stone-400 mx-auto mb-2" />
        <p className="text-xs text-stone-500">尚無相關筆記</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="px-3 py-2 bg-stone-50 rounded-lg border border-stone-200">
        <h4 className="text-xs font-semibold text-stone-700 mb-2 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" />
          相關筆記推薦
        </h4>
        <div className="space-y-2">
          {recommendedNotes.map((note) => (
            <Link key={note.id} href={`/notes/${note.id}`}>
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto py-2 px-2.5 text-xs group hover:bg-stone-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-700 truncate group-hover:text-stone-900">
                    {note.summary}
                  </p>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    相關度: {(note.relevanceScore * 100).toFixed(0)}%
                  </p>
                  <p className="text-[9px] text-stone-400 mt-1">
                    {note.relevanceReason}
                  </p>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {note.tags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[8px] h-4 px-1.5"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 2 && (
                        <span className="text-[8px] text-stone-400">
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-stone-600 ml-2 shrink-0" />
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
