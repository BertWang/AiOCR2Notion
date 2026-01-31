import { prisma } from '@/lib/prisma';

/**
 * 筆記關聯分析系統
 * 使用 Gemini AI 分析筆記間的語義關聯
 */

export interface NoteCorrelation {
  sourceNoteId: string;
  relatedNoteId: string;
  correlationType: 'semantic' | 'tag-based' | 'temporal';
  relevanceScore: number; // 0.0-1.0
  commonTags: string[];
  relationshipDescription: string;
}

export interface NotesGraph {
  nodes: Array<{
    id: string;
    title: string;
    tags: string[];
    createdAt: Date;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    type: 'semantic' | 'tag-based' | 'temporal';
  }>;
}

/**
 * 分析兩份筆記的相似度
 */
async function analyzeNoteSimilarity(
  note1Id: string,
  note2Id: string
): Promise<NoteCorrelation | null> {
  try {
    const note1 = await prisma.note.findUnique({
      where: { id: note1Id },
    });
    const note2 = await prisma.note.findUnique({
      where: { id: note2Id },
    });

    if (!note1 || !note2) return null;

    // 計算標籤重疊
    const tags1 = note1.tags ? note1.tags.split(',').map(t => t.trim()) : [];
    const tags2 = note2.tags ? note2.tags.split(',').map(t => t.trim()) : [];
    
    const commonTags = tags1.filter(tag => tags2.includes(tag));
    const tagSimilarity = commonTags.length > 0 ? 
      (2 * commonTags.length) / (tags1.length + tags2.length) : 0;

    // 計算時間接近度
    const timeDiff = Math.abs(
      new Date(note1.createdAt).getTime() - new Date(note2.createdAt).getTime()
    );
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    const temporalSimilarity = daysDiff <= 7 ? 0.8 - (daysDiff / 7) * 0.3 : 0;

    // 計算內容相似度（基於摘要和關鍵字）
    const content1 = (note1.summary || note1.refinedContent || '').toLowerCase();
    const content2 = (note2.summary || note2.refinedContent || '').toLowerCase();
    
    const words1 = new Set(content1.split(/\s+/));
    const words2 = new Set(content2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;

    // 綜合相似度評分
    const relevanceScore = Math.max(
      tagSimilarity * 0.4 + jaccardSimilarity * 0.4 + temporalSimilarity * 0.2
    );

    // 決定關聯類型
    let correlationType: 'semantic' | 'tag-based' | 'temporal' = 'semantic';
    if (commonTags.length > 0 && relevanceScore > tagSimilarity * 0.5) {
      correlationType = 'tag-based';
    } else if (temporalSimilarity > 0.6) {
      correlationType = 'temporal';
    }

    const relationshipDescription = 
      correlationType === 'tag-based' ? 
        `共享標籤: ${commonTags.join(', ')}` :
      correlationType === 'temporal' ?
        `時間接近 (${daysDiff.toFixed(0)} 天)` :
        '內容相關';

    return {
      sourceNoteId: note1Id,
      relatedNoteId: note2Id,
      correlationType,
      relevanceScore,
      commonTags,
      relationshipDescription,
    };
  } catch (error) {
    console.error('Error analyzing note similarity:', error);
    return null;
  }
}

/**
 * 為單份筆記找出相關的其他筆記
 */
export async function findRelatedNotes(
  noteId: string,
  limit: number = 5
): Promise<NoteCorrelation[]> {
  try {
    const allNotes = await prisma.note.findMany({
      where: { 
        id: { not: noteId },
        status: 'COMPLETED'
      },
      select: { id: true }
    });

    const correlations: NoteCorrelation[] = [];

    for (const otherNote of allNotes) {
      const correlation = await analyzeNoteSimilarity(noteId, otherNote.id);
      if (correlation && correlation.relevanceScore > 0.2) {
        correlations.push(correlation);
      }
    }

    return correlations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  } catch (error) {
    console.error('Error finding related notes:', error);
    return [];
  }
}

/**
 * 構建整個筆記庫的知識圖譜
 */
export async function buildNotesGraph(): Promise<NotesGraph> {
  try {
    const notes = await prisma.note.findMany({
      where: { status: 'COMPLETED' },
      select: {
        id: true,
        summary: true,
        tags: true,
        createdAt: true,
      }
    });

    const nodes = notes.map(note => ({
      id: note.id,
      title: note.summary || 'Untitled',
      tags: note.tags ? note.tags.split(',').map(t => t.trim()) : [],
      createdAt: note.createdAt,
    }));

    const edges = [];
    
    // 計算所有邊
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const correlation = await analyzeNoteSimilarity(notes[i].id, notes[j].id);
        if (correlation && correlation.relevanceScore > 0.3) {
          edges.push({
            source: correlation.sourceNoteId,
            target: correlation.relatedNoteId,
            weight: correlation.relevanceScore,
            type: correlation.correlationType,
          });
        }
      }
    }

    return {
      nodes,
      edges,
    };
  } catch (error) {
    console.error('Error building notes graph:', error);
    return { nodes: [], edges: [] };
  }
}

/**
 * 提取關鍵主題聚類
 */
export async function extractTopicClusters(): Promise<
  Array<{
    topicId: string;
    name: string;
    tags: string[];
    noteIds: string[];
    size: number;
  }>
> {
  try {
    const notes = await prisma.note.findMany({
      where: { status: 'COMPLETED' },
      select: { id: true, tags: true }
    });

    const tagGroups: Record<string, Set<string>> = {};

    // 按標籤分組筆記
    notes.forEach(note => {
      const tags = note.tags ? note.tags.split(',').map(t => t.trim()) : [];
      tags.forEach(tag => {
        if (!tagGroups[tag]) {
          tagGroups[tag] = new Set();
        }
        tagGroups[tag].add(note.id);
      });
    });

    // 轉換為聚類
    const clusters = Object.entries(tagGroups)
      .map(([tag, noteIds]) => ({
        topicId: `topic-${tag}`,
        name: tag,
        tags: [tag],
        noteIds: Array.from(noteIds),
        size: noteIds.size,
      }))
      .filter(cluster => cluster.size >= 2) // 只保留至少 2 份筆記的聚類
      .sort((a, b) => b.size - a.size);

    return clusters;
  } catch (error) {
    console.error('Error extracting topic clusters:', error);
    return [];
  }
}

/**
 * 獲取推薦的相關筆記（用於顯示在側邊欄）
 */
export async function getRecommendedNotes(
  noteId: string,
  limit: number = 3
): Promise<Array<{
  id: string;
  summary: string;
  tags: string[];
  relevanceReason: string;
  relevanceScore: number;
}>> {
  try {
    const relatedNotes = await findRelatedNotes(noteId, limit);

    const recommendations = await Promise.all(
      relatedNotes.map(async (correlation) => {
        const note = await prisma.note.findUnique({
          where: { id: correlation.relatedNoteId },
          select: { summary: true, tags: true }
        });

        if (!note) return null;

        return {
          id: correlation.relatedNoteId,
          summary: note.summary || '無標題',
          tags: note.tags ? note.tags.split(',').map(t => t.trim()) : [],
          relevanceReason: correlation.relationshipDescription,
          relevanceScore: correlation.relevanceScore,
        };
      })
    );

    return recommendations.filter(Boolean) as any[];
  } catch (error) {
    console.error('Error getting recommended notes:', error);
    return [];
  }
}
