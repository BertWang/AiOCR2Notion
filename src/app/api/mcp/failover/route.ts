import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const prismaClient = prisma as any;

interface FailoverEvent {
  serviceId: string;
  fromProvider: string;
  toProvider: string;
  reason: string;
  timestamp: string;
  success: boolean;
}

/**
 * MCP 故障轉移系統
 * GET /api/mcp/failover - 獲取故障轉移配置
 * POST /api/mcp/failover - 觸發故障轉移
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get("serviceId");

    if (!serviceId) {
      return NextResponse.json(
        { error: "Missing serviceId" },
        { status: 400 }
      );
    }

    // 獲取服務配置
    const service = await prismaClient.mCPServiceConfig.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // 獲取所有啟用的備用提供商
    const backupServices = await prismaClient.mCPServiceConfig.findMany({
      where: {
        enabled: true,
        type: service.type,
        NOT: {
          id: serviceId,
        },
      },
      orderBy: {
        priority: "asc",
      },
    });

    // 獲取轉移歷史
    const history = await prismaClient.mCPSyncLog.findMany({
      where: {
        action: "failover",
        serviceName: service.name,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      currentService: {
        id: service.id,
        name: service.name,
        type: service.type,
        enabled: service.enabled,
        status: service.lastTestStatus,
        lastTestedAt: service.lastTestedAt,
      },
      backupServices: backupServices.map((s: any) => ({
        id: s.id,
        name: s.name,
        priority: s.priority,
        status: s.lastTestStatus,
        successRate: s.successRate || 0,
      })),
      failoverHistory: history.map((h: any) => ({
        timestamp: h.createdAt,
        action: h.action,
        status: h.status,
        details: h.error || h.output,
      })),
    });
  } catch (error) {
    console.error("Failover config fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch failover config" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId, reason } = body;

    if (!serviceId) {
      return NextResponse.json(
        { error: "Missing serviceId" },
        { status: 400 }
      );
    }

    // 獲取當前服務
    const currentService = await prismaClient.mCPServiceConfig.findUnique({
      where: { id: serviceId },
    });

    if (!currentService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // 查找備用服務（按優先級排序）
    const backupServices = await prismaClient.mCPServiceConfig.findMany({
      where: {
        enabled: true,
        type: currentService.type,
        NOT: {
          id: serviceId,
        },
      },
      orderBy: [
        { priority: "asc" },
        { successRate: "desc" },
      ],
    });

    if (backupServices.length === 0) {
      return NextResponse.json(
        {
          error: "No backup services available",
          failoverRequired: true,
          backupCount: 0,
        },
        { status: 503 }
      );
    }

    // 嘗試轉移到第一個備用服務
    const targetService = backupServices[0];

    // 記錄轉移事件
    const failoverEvent: FailoverEvent = {
      serviceId,
      fromProvider: currentService.name,
      toProvider: targetService.name,
      reason: reason || "Manual failover triggered",
      timestamp: new Date().toISOString(),
      success: true,
    };

    // 更新同步日誌
    await prismaClient.mCPSyncLog.create({
      data: {
        serviceName: currentService.name,
        action: "failover",
        status: "success",
        input: JSON.stringify({
          from: currentService.id,
          to: targetService.id,
          reason,
        }),
        output: JSON.stringify(failoverEvent),
        executionTimeMs: 0,
      },
    });

    // 禁用當前服務
    await prismaClient.mCPServiceConfig.update({
      where: { id: serviceId },
      data: {
        enabled: false,
        lastErrorMessage: `Failover triggered: ${reason || "Health check failed"}`,
        lastErrorAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      failover: failoverEvent,
      targetService: {
        id: targetService.id,
        name: targetService.name,
        priority: targetService.priority,
        successRate: targetService.successRate,
      },
      message: `成功從 ${currentService.name} 轉移到 ${targetService.name}`,
    });
  } catch (error) {
    console.error("Failover failed:", error);
    return NextResponse.json(
      {
        error: "Failover operation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
