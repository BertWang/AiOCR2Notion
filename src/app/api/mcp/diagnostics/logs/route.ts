import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const prismaClient = prisma as any;

interface DiagnosticLog {
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  serviceId: string;
  serviceName: string;
  metadata?: Record<string, any>;
}

/**
 * 保存診斷日誌
 * POST /api/mcp/diagnostics/log - 保存服務診斷日誌
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId, serviceName, level, message, metadata } = body;

    if (!serviceId || !serviceName || !level || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 更新或創建 MCPSyncLog 記錄
    const logEntry = await prismaClient.mCPSyncLog.create({
      data: {
        noteId: "diagnostic", // 使用特殊標識
        serviceName,
        action: "diagnostic_check",
        status: level === "error" ? "failed" : level === "success" ? "success" : "pending",
        input: JSON.stringify({
          timestamp: new Date().toISOString(),
          level,
          message,
        }),
        output: JSON.stringify(metadata || {}),
        error: level === "error" ? message : null,
      },
    });

    return NextResponse.json({
      success: true,
      logId: logEntry.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to save diagnostic log:", error);
    return NextResponse.json(
      { error: "Failed to save log" },
      { status: 500 }
    );
  }
}

/**
 * 獲取診斷日誌
 * GET /api/mcp/diagnostics/logs?serviceId=xxx&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");
    const limit = parseInt(searchParams.get("limit") || "50");

    // 獲取相關服務的日誌
    const logs = await prismaClient.mCPSyncLog.findMany({
      where: {
        serviceName: serviceId ? undefined : { contains: serviceId || "" },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // 解析日誌數據
    const parsedLogs = logs.map((log: any) => {
      let input = {};
      try {
        input = JSON.parse(log.input || "{}");
      } catch (e) {
        input = {};
      }

      let output = {};
      try {
        output = JSON.parse(log.output || "{}");
      } catch (e) {
        output = {};
      }

      return {
        id: log.id,
        timestamp: log.createdAt,
        serviceName: log.serviceName,
        level:
          log.status === "failed"
            ? "error"
            : log.status === "success"
              ? "success"
              : "info",
        message: (input as any).message || log.action,
        metadata: output,
        executionTimeMs: log.executionTimeMs || 0,
      };
    });

    return NextResponse.json({
      success: true,
      logs: parsedLogs,
      total: parsedLogs.length,
    });
  } catch (error) {
    console.error("Failed to fetch diagnostic logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
