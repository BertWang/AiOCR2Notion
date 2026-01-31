import { NextRequest, NextResponse } from 'next/server';
import {
  buildNotesGraph,
  extractTopicClusters,
} from '@/lib/note-correlation';

/**
 * GET /api/knowledge-graph
 * 獲取完整的知識圖譜數據
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'graph'; // 'graph' 或 'clusters'

    if (type === 'clusters') {
      const clusters = await extractTopicClusters();
      return NextResponse.json({
        success: true,
        type: 'clusters',
        data: clusters,
      });
    }

    // 默認返回圖譜
    const graph = await buildNotesGraph();
    return NextResponse.json({
      success: true,
      type: 'graph',
      data: graph,
    });
  } catch (error) {
    console.error('Error building knowledge graph:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
