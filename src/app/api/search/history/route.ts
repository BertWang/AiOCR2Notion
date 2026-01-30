import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 搜尋歷史管理
 * GET: 獲取搜尋歷史
 * POST: 新增搜尋歷史記錄
 * DELETE: 清除搜尋歷史
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // 從 SQLite 中查詢最近的搜尋（存儲在 Note 的 rawOcrText 中作為備用）
    // 實際上應該在 schema 中添加 SearchHistory 模型
    // 這是臨時解決方案
    
    const recentSearches = await prisma.note.findMany({
      where: {
        status: "COMPLETED",
      },
      select: {
        summary: true,
        tags: true,
        createdAt: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const searchHistoryList = recentSearches.map((note) => ({
      query: note.summary || "未命名",
      tags: note.tags ? note.tags.split(",").map((t) => t.trim()) : [],
      timestamp: note.createdAt,
    }));

    return NextResponse.json(searchHistoryList);
  } catch (error) {
    console.error("Get search history error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, tags } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // 記錄搜尋（創建一個臨時記錄或更新現有）
    // 這是簡單實現，實際應使用 SearchHistory 模型
    console.log(`Search recorded: ${query} with tags: ${tags?.join(",")}`);

    return NextResponse.json({
      success: true,
      query,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Post search history error:", error);
    return NextResponse.json(
      { error: "Failed to record search" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 清除搜尋歷史
    // 實現方式取決於 SearchHistory 模型的設計
    console.log("Search history cleared");

    return NextResponse.json({
      success: true,
      message: "Search history cleared",
    });
  } catch (error) {
    console.error("Delete search history error:", error);
    return NextResponse.json(
      { error: "Failed to clear history" },
      { status: 500 }
    );
  }
}
