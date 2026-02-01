import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const prismaClient = prisma as any;

/**
 * PATCH /api/mcp/services/[id]/toggle
 * 切換服務啟用/停用狀態
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const service = await prismaClient.mCPServiceConfig.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const updated = await prismaClient.mCPServiceConfig.update({
      where: { id },
      data: {
        enabled: !service.enabled,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      enabled: updated.enabled,
      message: `服務已${updated.enabled ? "啟用" : "停用"}`,
    });
  } catch (error) {
    console.error("Toggle service error:", error);
    return NextResponse.json(
      { error: "Failed to toggle service" },
      { status: 500 }
    );
  }
}
