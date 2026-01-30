import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : null;
    const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : null;
    const confidenceMin = searchParams.get("confidenceMin") ? parseFloat(searchParams.get("confidenceMin")!) : null;
    const confidenceMax = searchParams.get("confidenceMax") ? parseFloat(searchParams.get("confidenceMax")!) : null;
    const status = searchParams.get("status");
    const tags = searchParams.get("tags")?.split(',').map(t => t.trim()).filter(Boolean) || [];

    // 構建 where 條件
    const where: any = {
      AND: [],
    };

    // 關鍵字搜尋（全文檢索）
    if (query) {
      where.AND.push({
        OR: [
          { refinedContent: { contains: query } },
          { summary: { contains: query } },
          { tags: { contains: query } },
          { rawOcrText: { contains: query } },
        ],
      });
    }

    // 日期範圍過濾
    if (dateFrom || dateTo) {
      const dateCondition: any = {};
      if (dateFrom) dateCondition.gte = dateFrom;
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        dateCondition.lte = endOfDay;
      }
      where.AND.push({ createdAt: dateCondition });
    }

    // 信心分數範圍過濾
    if (confidenceMin !== null || confidenceMax !== null) {
      const confidenceCondition: any = {};
      if (confidenceMin !== null) confidenceCondition.gte = confidenceMin;
      if (confidenceMax !== null) confidenceCondition.lte = confidenceMax;
      where.AND.push({ confidence: confidenceCondition });
    }

    // 狀態過濾
    if (status && status !== 'all') {
      where.AND.push({ status });
    }

    // 標籤過濾（所有指定標籤都要存在）
    if (tags.length > 0) {
      tags.forEach(tag => {
        where.AND.push({ tags: { contains: tag } });
      });
    }

    // 如果沒有任何條件，返回空結果
    if (where.AND.length === 0 && !query) {
      return NextResponse.json([]);
    }

    // 執行搜尋
    const notes = await prisma.note.findMany({
      where: where.AND.length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
      take: 100, // 限制結果數量
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
