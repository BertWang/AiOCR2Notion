import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const prismaClient = prisma as any;

/**
 * MCP 服務評分端點
 * POST /api/mcp/[id]/rate - 添加或更新評分
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing service ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rating, review } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // 驗證服務存在
    const service = await prismaClient.mCPServiceRegistry.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const userId = "default"; // 簡化版，可擴展多用戶支持

    // 檢查是否已評分
    const existing = await prismaClient.mCPServiceRating.findUnique({
      where: {
        userId_serviceId: {
          userId,
          serviceId: id,
        },
      },
    });

    if (existing) {
      // 更新評分
      const updated = await prismaClient.mCPServiceRating.update({
        where: {
          userId_serviceId: {
            userId,
            serviceId: id,
          },
        },
        data: {
          rating,
          review: review || null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Rating updated",
        rating: updated.rating,
        review: updated.review,
      });
    } else {
      // 新增評分
      const newRating = await prismaClient.mCPServiceRating.create({
        data: {
          userId,
          serviceId: id,
          rating,
          review: review || null,
        },
      });

      // 更新服務的平均評分和評論數
      const allRatings = await prismaClient.mCPServiceRating.findMany({
        where: { serviceId: id },
      });

      const avgRating =
        allRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / allRatings.length;

      await prismaClient.mCPServiceRegistry.update({
        where: { id },
        data: {
          rating: Math.round(avgRating * 10) / 10,
          reviews: allRatings.length,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Rating created",
        rating: newRating.rating,
        review: newRating.review,
      });
    }
  } catch (error) {
    console.error("MCP 評分操作失敗:", error);
    return NextResponse.json(
      {
        error: "Failed to rate service",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mcp/[id]/rate - 獲取用戶的評分
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing service ID" },
        { status: 400 }
      );
    }

    const userId = "default";

    const userRating = await prismaClient.mCPServiceRating.findUnique({
      where: {
        userId_serviceId: {
          userId,
          serviceId: id,
        },
      },
    });

    if (!userRating) {
      return NextResponse.json({
        success: true,
        userRating: null,
        hasRated: false,
      });
    }

    return NextResponse.json({
      success: true,
      userRating: {
        rating: userRating.rating,
        review: userRating.review,
      },
      hasRated: true,
    });
  } catch (error) {
    console.error("MCP 評分查詢失敗:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch rating",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
