import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findDuplicates, type Note } from "@/lib/deduplication/similarity";

/**
 * GET /api/notes/duplicates
 * 
 * 查詢參數：
 * - threshold: 相似度閾值 (0.0 - 1.0)，預設 0.85
 * - limit: 最多返回幾組重複，預設 50
 * - includeImages: 是否檢查圖片相似度，預設 false
 * 
 * 回應：
 * - groups: DuplicateGroup[] - 重複組陣列
 * - summary: string - 去重報告摘要
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // 解析查詢參數
    const threshold = parseFloat(searchParams.get('threshold') || '0.85');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeImages = searchParams.get('includeImages') === 'true';
    
    // 驗證參數
    if (threshold < 0 || threshold > 1) {
      return NextResponse.json(
        { error: "Threshold must be between 0 and 1" },
        { status: 400 }
      );
    }
    
    // 1. 獲取所有筆記（只載入必要欄位）
    const notes = await prisma.note.findMany({
      where: {
        status: 'COMPLETED', // 只檢查已完成的筆記
      },
      select: {
        id: true,
        refinedContent: true,
        rawOcrText: true,
        summary: true,
        imageUrl: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    if (notes.length < 2) {
      return NextResponse.json({
        groups: [],
        summary: "筆記數量不足 2 份，無需去重",
        totalNotes: notes.length,
      });
    }
    
    // 2. 執行去重檢測
    const duplicateGroups = findDuplicates(notes as Note[], {
      textThreshold: threshold,
      includeImages,
      batchSize: 100,
    });
    
    // 3. 限制返回數量
    const limitedGroups = duplicateGroups.slice(0, limit);
    
    // 4. 生成摘要報告
    const totalDuplicates = limitedGroups.reduce((sum, g) => sum + g.notes.length, 0);
    const uniqueNotes = totalDuplicates - limitedGroups.length;
    
    const summary = limitedGroups.length > 0
      ? `找到 ${limitedGroups.length} 組重複筆記，共 ${totalDuplicates} 份筆記，建議處理 ${uniqueNotes} 份重複內容`
      : "未發現重複筆記";
    
    return NextResponse.json({
      groups: limitedGroups,
      summary,
      totalNotes: notes.length,
      totalGroups: limitedGroups.length,
      threshold,
    });
    
  } catch (error) {
    console.error("Duplicate Detection Error:", error);
    return NextResponse.json(
      { error: "Failed to detect duplicates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/duplicates
 * 
 * 請求體：
 * - noteIds: string[] - 要檢查的特定筆記 ID
 * - threshold: number - 相似度閾值
 * 
 * 回應：
 * - results: SimilarityResult[] - 配對比較結果
 */
export async function POST(request: NextRequest) {
  try {
    const { noteIds, threshold = 0.85 } = await request.json();
    
    if (!noteIds || !Array.isArray(noteIds) || noteIds.length < 2) {
      return NextResponse.json(
        { error: "Please provide at least 2 note IDs" },
        { status: 400 }
      );
    }
    
    // 獲取指定筆記
    const notes = await prisma.note.findMany({
      where: {
        id: { in: noteIds },
        status: 'COMPLETED',
      },
      select: {
        id: true,
        refinedContent: true,
        rawOcrText: true,
        summary: true,
        imageUrl: true,
      },
    });
    
    if (notes.length < 2) {
      return NextResponse.json(
        { error: "Not enough valid notes found" },
        { status: 404 }
      );
    }
    
    // 執行去重檢測
    const duplicateGroups = findDuplicates(notes as Note[], {
      textThreshold: threshold,
    });
    
    return NextResponse.json({
      groups: duplicateGroups,
      totalNotes: notes.length,
      hasDuplicates: duplicateGroups.length > 0,
    });
    
  } catch (error) {
    console.error("Duplicate Check Error:", error);
    return NextResponse.json(
      { error: "Failed to check duplicates" },
      { status: 500 }
    );
  }
}
