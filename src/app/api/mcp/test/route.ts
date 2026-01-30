// src/app/api/mcp/test/route.ts
// MCP 服務測試 API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServiceManager } from '@/lib/mcp';

/**
 * POST /api/mcp/test
 * 測試 MCP 服務連接
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId } = body;

    if (!serviceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing serviceId',
        },
        { status: 400 }
      );
    }

    // 獲取服務配置
    const service = await prisma.mCPServiceConfig.findUnique({
      where: { id: serviceId },
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

    // 執行測試
    const testStartTime = Date.now();
    const manager = getServiceManager();

    try {
      // 確保服務已連接
      if (!service.enabled) {
        return NextResponse.json(
          {
            success: false,
            error: 'Service is disabled',
            status: 'failed',
            testTime: Date.now() - testStartTime,
          },
          { status: 400 }
        );
      }

      // 嘗試連接服務
      await manager.connect(serviceId);

      // 執行簡單操作以測試連接
      const result = await manager.executeOperation(serviceId, 'test', {});

      // 更新測試狀態
      await prisma.mCPServiceConfig.update({
        where: { id: serviceId },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: result.success ? 'success' : 'failed',
          lastTestError: result.error || null,
        },
      });

      return NextResponse.json({
        success: result.success,
        status: result.status,
        data: result,
        testTime: Date.now() - testStartTime,
        message: result.success ? 'Service test passed' : 'Service test failed',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 更新失敗狀態
      await prisma.mCPServiceConfig.update({
        where: { id: serviceId },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: 'failed',
          lastTestError: errorMessage,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          status: 'failed',
          testTime: Date.now() - testStartTime,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[MCP API] Test service error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test service',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mcp/health
 * 獲取所有服務的健康狀態
 */
export async function GET() {
  try {
    const manager = getServiceManager();
    const health = await manager.checkHealth();
    const status = manager.getSystemStatus();

    return NextResponse.json({
      success: true,
      health,
      systemStatus: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[MCP API] Health check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get health status',
      },
      { status: 500 }
    );
  }
}
