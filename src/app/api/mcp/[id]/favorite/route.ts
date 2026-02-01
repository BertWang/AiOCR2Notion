import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const prismaClient = prisma as any;

/**
 * MCP 服務收藏端點
 * POST /api/mcp/[id]/favorite - 添加或移除收藏
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
    const { action } = body; // "add" or "remove"

    if (!action || !["add", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'add' or 'remove'" },
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

    if (action === "add") {
      // 檢查是否已收藏
      const existing = await prismaClient.mCPServiceFavorite.findUnique({
        where: {
          userId_serviceId: {
            userId,
            serviceId: id,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Already favorited", isFavorited: true },
          { status: 409 }
        );
      }

      // 添加收藏
      await prismaClient.mCPServiceFavorite.create({
        data: {
          userId,
          serviceId: id,
        },
      });

      return NextResponse.json({
        success: true,
        isFavorited: true,
        message: "Service favorited",
      });
    } else {
      // 移除收藏
      const existing = await prismaClient.mCPServiceFavorite.findUnique({
        where: {
          userId_serviceId: {
            userId,
            serviceId: id,
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Not favorited", isFavorited: false },
          { status: 409 }
        );
      }

      await prismaClient.mCPServiceFavorite.delete({
        where: {
          userId_serviceId: {
            userId,
            serviceId: id,
          },
        },
      });

      return NextResponse.json({
        success: true,
        isFavorited: false,
        message: "Service unfavorited",
      });
    }
  } catch (error) {
    console.error("MCP 收藏操作失敗:", error);
    return NextResponse.json(
      {
        error: "Failed to toggle favorite",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
