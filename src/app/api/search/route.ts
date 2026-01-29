import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      // 如果沒有查詢關鍵字，返回所有筆記或空陣列，這取決於產品需求
      // 這裡我們返回空陣列
      return NextResponse.json([]);
    }

    // 在 Prisma 中進行模糊搜尋
    // SQLite 的 `contains` 操作符不區分大小寫，並且能進行部分匹配
    const notes = await prisma.note.findMany({
      where: {
        OR: [
          {
            refinedContent: {
              contains: query, // 搜尋修正後的內容
            },
          },
          {
            summary: {
              contains: query, // 搜尋摘要
            },
          },
          {
            tags: {
              contains: query, // 搜尋標籤
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
