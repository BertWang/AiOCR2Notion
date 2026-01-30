import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 搜尋歷史管理 API
 * GET: 獲取搜尋歷史 (支援分頁)
 * POST: 新增搜尋歷史記錄
 * DELETE: 清除搜尋歷史
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("userId") || "default";

    // 從 SearchHistory 表中查詢最近的搜尋
    const searchHistoryList = await prisma.searchHistory.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        query: true,
        resultCount: true,
        createdAt: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    // 計算總數
    const total = await prisma.searchHistory.count({
      where: {
        userId: userId,
      },
    });

    return NextResponse.json({
      data: searchHistoryList,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get search history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch search history" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, filters, resultCount, userId = "default" } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // 記錄新的搜尋
    const searchRecord = await prisma.searchHistory.create({
      data: {
        query: query.trim(),
        filters: filters ? JSON.stringify(filters) : null,
        resultCount: resultCount || 0,
        userId: userId,
      },
      select: {
        id: true,
        query: true,
        resultCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: searchRecord,
      },
      { status: 201 }
    );
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";
    const historyId = searchParams.get("id");

    if (historyId) {
      // 刪除特定記錄
      await prisma.searchHistory.delete({
        where: {
          id: historyId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Search history item deleted",
      });
    } else {
      // 清除用戶所有搜尋歷史
      const result = await prisma.searchHistory.deleteMany({
        where: {
          userId: userId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Search history cleared",
        deletedCount: result.count,
      });
    }
  } catch (error) {
    console.error("Delete search history error:", error);
    return NextResponse.json(
      { error: "Failed to delete history" },
      { status: 500 }
    );
  }
}
