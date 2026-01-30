// src/app/api/mcp/operations/route.ts
// MCP 操作執行 API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServiceManager } from '@/lib/mcp';

/**
 * POST /api/mcp/operations
 * 執行 MCP 操作
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { noteId, serviceName, action, input, options } = body;

    // 驗證必需字段
    if (!serviceName || !action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: serviceName, action',
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    try {
      // 獲取服務配置
      const service = await prisma.mCPServiceConfig.findFirst({
        where: {
          name: serviceName,
          enabled: true,
        },
      });

      if (!service) {
        return NextResponse.json(
          {
            success: false,
            error: `Service "${serviceName}" not found or disabled`,
          },
          { status: 404 }
        );
      }

      // 執行操作
      const manager = getServiceManager();
      const result = await manager.executeOperation(
        service.id,
        action,
        input,
        options
      );

      // 記錄同步操作
      let syncLog = null;
      if (noteId) {
        syncLog = await prisma.mCPSyncLog.create({
          data: {
            noteId,
            serviceName,
            action: action as any,
            status: result.status as any,
            input: JSON.stringify(input),
            output: result.data ? JSON.stringify(result.data) : null,
            error: result.error || null,
            executionTimeMs: result.executionTimeMs,
          },
        });
      }

      return NextResponse.json({
        success: result.success,
        status: result.status,
        data: result.data,
        error: result.error,
        executionTimeMs: result.executionTimeMs,
        syncLogId: syncLog?.id,
        message: result.success
          ? `Operation "${action}" completed successfully`
          : `Operation "${action}" failed`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 記錄失敗
      if (noteId) {
        await prisma.mCPSyncLog.create({
          data: {
            noteId,
            serviceName,
            action: action as any,
            status: 'failed',
            input: JSON.stringify(input),
            error: errorMessage,
            executionTimeMs: Date.now() - startTime,
          },
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          status: 'failed',
          executionTimeMs: Date.now() - startTime,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[MCP API] Operation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute operation',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mcp/operations
 * 獲取操作日誌
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');
    const serviceName = searchParams.get('serviceName');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (noteId) where.noteId = noteId;
    if (serviceName) where.serviceName = serviceName;

    const [logs, total] = await Promise.all([
      prisma.mCPSyncLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          noteId: true,
          serviceName: true,
          action: true,
          status: true,
          error: true,
          executionTimeMs: true,
          retryCount: true,
          createdAt: true,
        },
      }),
      prisma.mCPSyncLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        limit,
        offset,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[MCP API] Get operations error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch operations',
      },
      { status: 500 }
    );
  }
}
