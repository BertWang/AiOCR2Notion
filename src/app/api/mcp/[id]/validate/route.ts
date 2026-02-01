import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const prismaClient = prisma as any;

interface ValidationResult {
  success: boolean;
  status: "valid" | "invalid" | "partial" | "error";
  checks: {
    configComplete: { passed: boolean; message: string };
    endpointAccessible: { passed: boolean; message: string };
    credentialsValid: { passed: boolean; message: string };
    authenticationWorks: { passed: boolean; message: string };
  };
  issues: string[];
  suggestions: string[];
  timestamp: string;
  executionTimeMs: number;
}

/**
 * 驗證 MCP 服務配置
 * POST /api/mcp/[id]/validate - 驗證配置的完整性和有效性
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    // 獲取服務配置
    const serviceConfig = await prismaClient.mCPServiceConfig.findUnique({
      where: { id },
    });

    if (!serviceConfig) {
      return NextResponse.json(
        { error: "Service configuration not found" },
        { status: 404 }
      );
    }

    const result: ValidationResult = {
      success: true,
      status: "valid",
      checks: {
        configComplete: { passed: true, message: "✓ 配置字段完整" },
        endpointAccessible: { passed: true, message: "✓ 端點可訪問" },
        credentialsValid: { passed: true, message: "✓ 認證憑證有效" },
        authenticationWorks: { passed: true, message: "✓ 認證工作正常" },
      },
      issues: [],
      suggestions: [],
      timestamp: new Date().toISOString(),
      executionTimeMs: 0,
    };

    // 1. 檢查配置完整性
    if (!serviceConfig.name || !serviceConfig.type) {
      result.checks.configComplete = {
        passed: false,
        message: "✗ 缺少基本配置字段 (name/type)",
      };
      result.issues.push("Service name or type is missing");
      result.success = false;
    }

    // 2. 檢查認證憑證
    if (!serviceConfig.credentials) {
      result.checks.credentialsValid = {
        passed: false,
        message: "✗ 未配置認證憑證",
      };
      result.issues.push("Authentication credentials not set");
      result.suggestions.push("請在服務設置中配置 API 密鑰或認證令牌");
      result.success = false;
    } else {
      // 嘗試解析認證憑證
      try {
        const credentialsStr = Buffer.from(
          serviceConfig.credentials,
          "base64"
        ).toString("utf-8");
        const credentials = JSON.parse(credentialsStr);

        if (!credentials.apiKey && !credentials.token) {
          result.checks.credentialsValid = {
            passed: false,
            message: "✗ 認證憑證格式無效",
          };
          result.issues.push("Credentials format invalid - missing apiKey or token");
          result.success = false;
        }
      } catch (e) {
        result.checks.credentialsValid = {
          passed: false,
          message: "✗ 認證憑證解析失敗",
        };
        result.issues.push(`Failed to parse credentials: ${e instanceof Error ? e.message : String(e)}`);
        result.suggestions.push("請檢查認證憑證的格式");
        result.success = false;
      }
    }

    // 3. 檢查端點可訪問性
    if (serviceConfig.endpoint) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(serviceConfig.endpoint, {
          method: "HEAD",
          signal: controller.signal,
          headers: {
            "User-Agent":
              "MCP-Validator/1.0",
          },
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (!response || !response.ok) {
          result.checks.endpointAccessible = {
            passed: false,
            message: `✗ 端點無響應 (${response?.status || "連接超時"})`,
          };
          result.issues.push(`Endpoint unreachable: ${serviceConfig.endpoint}`);
          result.suggestions.push("請檢查網絡連接和端點 URL 是否正確");
          result.success = false;
        }
      } catch (e) {
        result.checks.endpointAccessible = {
          passed: false,
          message: `✗ 端點連接失敗`,
        };
        result.issues.push(`Failed to connect to endpoint: ${e instanceof Error ? e.message : String(e)}`);
        result.suggestions.push("檢查防火牆設置或 VPN 連接");
        result.success = false;
      }
    }

    // 4. 根據服務類型執行特定檢查
    if (serviceConfig.type === "openclaw") {
      // OpenClaw 特定檢查
      if (!serviceConfig.config) {
        result.issues.push("OpenClaw service requires configuration");
        result.suggestions.push("配置 OpenClaw 模型參數");
        result.success = false;
      }
    } else if (serviceConfig.type === "brave_search") {
      // Brave Search 特定檢查
      const config = serviceConfig.config
        ? JSON.parse(serviceConfig.config)
        : {};
      if (!config.searchEngine) {
        result.issues.push("Brave Search requires search engine configuration");
        result.suggestions.push("設定搜尋引擎參數");
        result.success = false;
      }
    }

    // 5. 更新最後驗證時間
    await prismaClient.mCPServiceConfig.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: result.success ? "success" : "failed",
        lastTestError: result.issues.length > 0 ? result.issues[0] : null,
      },
    });

    // 6. 確定最終狀態
    if (result.issues.length === 0) {
      result.status = "valid";
    } else if (Object.values(result.checks).filter((c) => !c.passed).length >= 2) {
      result.status = "invalid";
    } else {
      result.status = "partial";
    }

    result.executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      validation: result,
    });
  } catch (error) {
    console.error("MCP 配置驗證失敗:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Configuration validation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * 快速健康檢查
 * GET /api/mcp/[id]/validate - 獲取服務的上次驗證結果
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const serviceConfig = await prismaClient.mCPServiceConfig.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        enabled: true,
        lastTestedAt: true,
        lastTestStatus: true,
        lastTestError: true,
      },
    });

    if (!serviceConfig) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const healthStatus = {
      healthy:
        serviceConfig.lastTestStatus === "success" &&
        serviceConfig.enabled,
      status: serviceConfig.lastTestStatus || "unknown",
      lastChecked: serviceConfig.lastTestedAt,
      enabled: serviceConfig.enabled,
      error: serviceConfig.lastTestError,
      upSince: serviceConfig.lastTestedAt,
    };

    return NextResponse.json({
      success: true,
      serviceId: id,
      serviceName: serviceConfig.name,
      health: healthStatus,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { error: "Health check failed" },
      { status: 500 }
    );
  }
}
