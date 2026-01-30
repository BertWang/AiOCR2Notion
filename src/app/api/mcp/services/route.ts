// src/app/api/mcp/services/route.ts
// MCP 服務管理 API 路由

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MCPServiceConfig, MCPServiceType } from '@/lib/mcp/types';
import { getServiceManager } from '@/lib/mcp';

/**
 * GET /api/mcp/services
 * 獲取所有 MCP 服務配置
 */
export async function GET() {
  try {
    const services = await prisma.mCPServiceConfig.findMany({
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
        // 不返回敏感信息
        credentials: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: services,
      count: services.length,
    });
  } catch (error) {
    console.error('[MCP API] Get services error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch services',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp/services
 * 建立新的 MCP 服務配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 驗證必需字段
    if (!body.name || !body.type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, type',
        },
        { status: 400 }
      );
    }

    // 驗證服務類型
    const validTypes = [
      'openclaw',
      'brave_search',
      'github',
      'slack',
      'google_drive',
      'web_crawler',
      'sqlite',
      'filesystem',
    ];

    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid service type: ${body.type}`,
        },
        { status: 400 }
      );
    }

    // 檢查重複
    const existing = await prisma.mCPServiceConfig.findFirst({
      where: {
        name: body.name,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Service with name "${body.name}" already exists`,
        },
        { status: 409 }
      );
    }

    // 創建服務配置
    const service = await prisma.mCPServiceConfig.create({
      data: {
        name: body.name,
        type: body.type,
        enabled: body.enabled ?? true,
        endpoint: body.endpoint,
        authType: body.authType,
        credentials: body.credentials,
        config: body.config,
        retryPolicy: body.retryPolicy || 'moderate',
        rateLimitPerMinute: body.rateLimitPerMinute || 60,
        timeoutMs: body.timeoutMs || 30000,
        priority: body.priority || 0,
        isRequired: body.isRequired ?? false,
        description: body.description,
        lastTestStatus: 'unknown',
      },
      select: {
        id: true,
        name: true,
        type: true,
        enabled: true,
        endpoint: true,
        authType: true,
        credentials: true,
        config: true,
        retryPolicy: true,
        rateLimitPerMinute: true,
        timeoutMs: true,
        createdAt: true,
      },
    });

    // 初始化服務（在 ServiceManager 中註冊）
    try {
      const manager = getServiceManager();
      // 將數據庫記錄轉換為 MCPServiceConfig
      const configForManager: MCPServiceConfig = {
        id: service.id,
        name: service.name,
        type: service.type as MCPServiceType,
        enabled: service.enabled,
        endpoint: service.endpoint || undefined,
        authType: (service.authType as any) || undefined,
        credentials: service.credentials || undefined,
        config: service.config ? (typeof service.config === 'string' ? JSON.parse(service.config) : service.config) : undefined,
        retryPolicy: (service.retryPolicy as any) || 'moderate',
        rateLimitPerMinute: service.rateLimitPerMinute || 60,
        timeoutMs: service.timeoutMs || 30000,
      };
      await manager.registerService(configForManager);
    } catch (error) {
      console.error('[MCP API] Failed to register service in manager:', error);
    }

    return NextResponse.json(
      {
        success: true,
        data: service,
        message: 'Service created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[MCP API] Create service error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create service',
      },
      { status: 500 }
    );
  }
}
