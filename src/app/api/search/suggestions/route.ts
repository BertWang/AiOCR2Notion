import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 搜尋建議端點
 * 根據查詢字符串返回實時搜尋建議
 * 包括: 筆記摘要、標籤、已保存搜尋
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    const searchQuery = query.trim().toLowerCase();

    // 並行查詢 3 種建議類型
    const [noteSuggestions, tagSuggestions] = await Promise.all([
      // 1. 筆記摘要建議
      prisma.note.findMany({
        where: {
          OR: [
            {
              summary: {
                contains: searchQuery,
              },
            },
            {
              refinedContent: {
                contains: searchQuery,
              },
            },
          ],
        },
        select: {
          id: true,
          summary: true,
          status: true,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      // 2. 標籤建議（基於逗號分隔的標籤）
      (async () => {
        const notes = await prisma.note.findMany({
          where: {
            tags: {
              contains: searchQuery,
            },
          },
          select: { tags: true },
          take: 100, // 取更多以提取唯一標籤
        });

        // 提取並去重標籤
        const tagSet = new Set<string>();
        notes.forEach((note) => {
          if (note.tags) {
            note.tags.split(",").forEach((tag) => {
              const trimmedTag = tag.trim();
              if (trimmedTag.toLowerCase().includes(searchQuery)) {
                tagSet.add(trimmedTag);
              }
            });
          }
        });

        return Array.from(tagSet).slice(0, 5);
      })(),
    ]);

    // 構建返回格式
    const suggestions = [
      // 筆記建議
      ...noteSuggestions.map((note) => ({
        type: "note" as const,
        id: note.id,
        title: note.summary || "無標題筆記",
        subtitle: `摘要: ${note.summary?.substring(0, 50) || ""}`,
        status: note.status,
      })),

      // 標籤建議
      ...tagSuggestions.map((tag) => ({
        type: "tag" as const,
        id: tag,
        title: `#${tag}`,
        subtitle: "標籤",
      })),

      // 快速搜尋建議
      {
        type: "quick" as const,
        id: `query:${searchQuery}`,
        title: `搜尋 "${searchQuery}"`,
        subtitle: "快速搜尋",
      },
    ];

    return NextResponse.json(suggestions.slice(0, 10)); // 最多返回 10 個建議
  } catch (error) {
    console.error("Search suggestions error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
