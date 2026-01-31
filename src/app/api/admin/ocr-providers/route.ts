/**
 * OCR 提供商管理 API 端點
 * 支持所有提供商配置、優先級管理、健康檢查等
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OCRProviderManager } from '@/lib/ocr-provider-manager';

/**
 * GET /api/admin/ocr-providers
 * 獲取所有 OCR 提供商配置
 */
export async function GET(request: NextRequest) {
  try {
    const providers = await OCRProviderManager.getAllProviders();
    const analytics = await OCRProviderManager.getAnalytics();

    return NextResponse.json({
      success: true,
      providers,
      analytics,
    });
  } catch (error) {
    console.error('Error fetching OCR providers:', error);
    return NextResponse.json(
      { error: '無法獲取提供商配置' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/ocr-providers
 * 批量更新提供商配置
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { providers } = body;

    if (!Array.isArray(providers)) {
      return NextResponse.json(
        { error: '無效的提供商列表' },
        { status: 400 }
      );
    }

    const updated = [];

    for (const providerUpdate of providers) {
      const { provider, ...updates } = providerUpdate;

      if (!provider) {
        return NextResponse.json(
          { error: '缺少提供商名稱' },
          { status: 400 }
        );
      }

      const updatedProvider = await OCRProviderManager.updateProvider(
        provider,
        updates
      );
      updated.push(updatedProvider);
    }

    return NextResponse.json({
      success: true,
      message: `已更新 ${updated.length} 個提供商`,
      providers: updated,
    });
  } catch (error) {
    console.error('Error updating OCR providers:', error);
    return NextResponse.json(
      { error: '無法更新提供商配置' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ocr-providers/health-check
 * 檢查單個提供商的健康狀態
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider } = body;

    if (!provider) {
      return NextResponse.json(
        { error: '缺少提供商名稱' },
        { status: 400 }
      );
    }

    const healthStatus = await OCRProviderManager.healthCheck(provider);

    return NextResponse.json({
      success: true,
      health: healthStatus,
    });
  } catch (error) {
    console.error('Error checking OCR provider health:', error);
    return NextResponse.json(
      { error: '無法檢查提供商狀態' },
      { status: 500 }
    );
  }
}
