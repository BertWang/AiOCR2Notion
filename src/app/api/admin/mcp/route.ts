/**
 * MCP 服務器配置和管理 API
 */

import { NextRequest, NextResponse } from "next/server";
import { MCPServer, MCPServerRegistry } from "@/lib/mcp-server";
import { prisma } from "@/lib/prisma";

// 全局 MCP 服務器實例
let mcpServer: MCPServer | null = null;

function getMCPServer(): MCPServer {
  if (!mcpServer) {
    mcpServer = new MCPServer();
    // 註冊預定義的服務器
    Object.values(MCPServerRegistry).forEach(config => {
      mcpServer!.registerServer(config);
    });
  }
  return mcpServer;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const server = getMCPServer();

    if (action === "list") {
      const servers = Array.from(server.getServers().values()).map(s => ({
        name: s.name,
        enabled: s.enabled,
        resourceTypes: s.resourceHandlers?.map(h => h.type) || [],
      }));

      return NextResponse.json({ success: true, servers });
    }

    if (action === "health") {
      const health = await server.healthCheck();

      return NextResponse.json({
        success: true,
        health,
      });
    }

    if (action === "resources") {
      const handlers = Array.from(server.getResourceHandlers().values()).map(
        h => ({
          type: h.type,
          operations: h.operations.map(op => ({
            name: op.name,
            requiresAuth: op.requiresAuth,
          })),
        })
      );

      return NextResponse.json({
        success: true,
        resourceHandlers: handlers,
      });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in MCP API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, resourceType, operation, input, serverName, enabled } = body;

    const server = getMCPServer();

    if (action === "execute") {
      if (!resourceType || !operation) {
        return NextResponse.json(
          { error: "resourceType and operation required" },
          { status: 400 }
        );
      }

      const result = await server.executeOperation(
        resourceType,
        operation,
        input || {}
      );

      return NextResponse.json({
        success: true,
        result,
      });
    }

    if (action === "toggleServer") {
      if (!serverName) {
        return NextResponse.json(
          { error: "serverName required" },
          { status: 400 }
        );
      }

      // 保存配置到數據庫
      const integration = await prisma.integration.upsert({
        where: { provider: serverName },
        update: { enabled: enabled !== undefined ? enabled : true },
        create: {
          provider: serverName,
          enabled: enabled !== undefined ? enabled : true,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Server ${serverName} ${integration.enabled ? "enabled" : "disabled"}`,
      });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in MCP API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
