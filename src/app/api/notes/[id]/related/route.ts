import { NextRequest, NextResponse } from 'next/server';
import {
  findRelatedNotes,
  buildNotesGraph,
  extractTopicClusters,
} from '@/lib/note-correlation';

/**
 * GET /api/notes/[id]/related
 * 獲取特定筆記的相關筆記
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing note ID' }, { status: 400 });
    }

    const relatedNotes = await findRelatedNotes(id, 5);

    return NextResponse.json({
      success: true,
      noteId: id,
      relatedNotes,
    });
  } catch (error) {
    console.error('Error fetching related notes:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
