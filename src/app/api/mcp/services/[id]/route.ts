// src/app/api/mcp/services/[id]/route.ts
// MCP 單個服務管理 API 路由

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServiceManager } from '@/lib/mcp';

/**
 * GET /api/mcp/services/[id]
 * 獲取單個服務配置
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = await prisma.mCPServiceConfig.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        enabled: true,
        endpoint: true,
        authType: true,
        retryPolicy: true,
        rateLimitPerMinute: true,
        timeoutMs: true,
        priority: true,
        isRequired: true,
        description: true,
        lastTestedAt: true,
        lastTestStatus: true,
        lastTestError: true,
        createdAt: true,
        updatedAt: true,
        config: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('[MCP API] Get service error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch service',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mcp/services/[id]
 * 更新服務配置
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 檢查服務是否存在
    const existing = await prisma.mCPServiceConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service not found',
        },
        { status: 404 }
      );
    }

    // 如果更改名稱，檢查重複
    if (body.name && body.name !== existing.name) {
      const duplicate = await prisma.mCPServiceConfig.findFirst({
        where: {
          name: body.name,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: `Service with name "${body.name}" already exists`,
          },
          { status: 409 }
        );
      }
    }

    // 更新服務配置
    const updated = await prisma.mCPServiceConfig.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        enabled: body.enabled ?? existing.enabled,
        endpoint: body.endpoint ?? existing.endpoint,
        authType: body.authType ?? existing.authType,
        credentials: body.credentials ?? existing.credentials,
        config: body.config ?? existing.config,
        retryPolicy: body.retryPolicy ?? existing.retryPolicy,
        rateLimitPerMinute:
          body.rateLimitPerMinute ?? existing.rateLimitPerMinute,
        timeoutMs: body.timeoutMs ?? existing.timeoutMs,
        priority: body.priority ?? existing.priority,
        isRequired: body.isRequired ?? existing.isRequired,
        description: body.description ?? existing.description,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        type: true,
        enabled: true,
        updatedAt: true,
      },
    });

    // 更新 ServiceManager 中的配置
    try {
      const manager = getServiceManager();
      await manager.updateService(id, updated as any);
    } catch (error) {
      console.error('[MCP API] Failed to update service in manager:', error);
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Service updated successfully',
    });
  } catch (error) {
    console.error('[MCP API] Update service error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update service',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcp/services/[id]
 * 刪除服務配置
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 檢查服務是否存在
    const service = await prisma.mCPServiceConfig.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service not found',
        },
        { status: 404 }
      );
    }

    // 檢查是否為必需服務
    if (service.isRequired) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete required service',
        },
        { status: 409 }
      );
    }

    // 刪除服務配置
    await prisma.mCPServiceConfig.delete({
      where: { id },
    });

    // 從 ServiceManager 中移除
    try {
      const manager = getServiceManager();
      await manager.removeService(id);
    } catch (error) {
      console.error('[MCP API] Failed to remove service from manager:', error);
    }

    // 刪除相關的同步日誌
    await prisma.mCPSyncLog.deleteMany({
      where: {
        serviceName: service.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    console.error('[MCP API] Delete service error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete service',
      },
      { status: 500 }
    );
  }
}
