/**
 * AI 和模組配置管理 API
 * 允許在運行時動態配置 AI 服務、模組和 MCP
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AIProviderFactory } from "@/lib/ai-service/factory";
import { AIConfig, AIProviderType } from "@/lib/ai-service/types";

export async function GET(request: NextRequest) {
  try {
    // 獲取當前配置
    const settings = await prisma.adminSettings.findUnique({
      where: { id: "singleton" },
    });

    const config = settings
      ? {
          aiProvider: settings.aiProvider,
          modelName: settings.modelName,
          config: settings.config ? JSON.parse(settings.config) : {},
        }
      : null;

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error fetching AI config:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { aiProvider, modelName, config } = body;

    // 驗證提供商類型
    const validProviders: AIProviderType[] = [
      "gemini",
      "openai",
      "azure",
      "claude",
      "custom",
    ];
    if (!validProviders.includes(aiProvider)) {
      return NextResponse.json(
        { error: "Invalid AI provider" },
        { status: 400 }
      );
    }

    // 更新或創建設置
    const updated = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {
        aiProvider,
        modelName,
        config: config ? JSON.stringify(config) : null,
      },
      create: {
        id: "singleton",
        aiProvider,
        modelName,
        config: config ? JSON.stringify(config) : null,
      },
    });

    // 清除提供商緩存以使用新配置
    AIProviderFactory.clearCache();
    AIProviderFactory.registerConfig(aiProvider as AIProviderType, {
      provider: aiProvider,
      apiKey: process.env[`${aiProvider.toUpperCase()}_API_KEY`] || "",
      modelName,
      config,
    });

    return NextResponse.json({
      success: true,
      message: "Configuration updated successfully",
      config: {
        aiProvider,
        modelName,
        config,
      },
    });
  } catch (error) {
    console.error("Error updating AI config:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "healthCheck") {
      // 檢查當前 AI 提供商的健康狀態
      const provider = AIProviderFactory.getDefaultProvider();
      const isHealthy = await provider.healthCheck();

      return NextResponse.json({
        success: true,
        healthy: isHealthy,
        message: isHealthy
          ? "AI provider is healthy"
          : "AI provider health check failed",
      });
    }

    if (action === "testProvider") {
      // 測試新的 AI 提供商配置
      const { aiProvider, modelName, apiKey } = body;

      const testConfig: AIConfig = {
        provider: aiProvider as AIProviderType,
        apiKey: apiKey || process.env[`${aiProvider.toUpperCase()}_API_KEY`] || "",
        modelName: modelName || "default",
      };

      try {
        const testProvider = AIProviderFactory.createProvider(testConfig);
        const isHealthy = await testProvider.healthCheck();

        return NextResponse.json({
          success: true,
          healthy: isHealthy,
          message: isHealthy
            ? `${aiProvider} provider is working`
            : `${aiProvider} provider health check failed`,
        });
      } catch (testError) {
        return NextResponse.json(
          {
            success: false,
            error: testError instanceof Error ? testError.message : "Unknown error",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in AI config handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
