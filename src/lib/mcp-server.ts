/**
 * MCP (Model Context Protocol) 服務器集成
 * 允許與外部工具和系統集成
 */

import { MCPServerConfig, MCPResourceHandler, MCPOperation } from "./ai-service/types";

export class MCPServer {
  private servers = new Map<string, MCPServerConfig>();
  private resourceHandlers = new Map<string, MCPResourceHandler>();

  /**
   * 註冊 MCP 服務器
   */
  registerServer(config: MCPServerConfig): void {
    if (!config.enabled) {
      console.log(`[MCP] Server disabled: ${config.name}`);
      return;
    }

    console.log(`[MCP] Registering server: ${config.name}`);
    this.servers.set(config.name, config);

    // 註冊資源處理器
    if (config.resourceHandlers) {
      config.resourceHandlers.forEach(handler => {
        this.registerResourceHandler(handler);
      });
    }
  }

  private registerResourceHandler(handler: MCPResourceHandler): void {
    this.resourceHandlers.set(handler.type, handler);
    console.log(`[MCP] Resource handler registered: ${handler.type}`);
  }

  /**
   * 執行 MCP 操作
   */
  async executeOperation(
    resourceType: string,
    operation: string,
    input: Record<string, any>
  ): Promise<any> {
    const handler = this.resourceHandlers.get(resourceType);
    if (!handler) {
      throw new Error(`No resource handler for type: ${resourceType}`);
    }

    const op = handler.operations.find(o => o.name === operation);
    if (!op) {
      throw new Error(
        `Operation ${operation} not supported for resource type ${resourceType}`
      );
    }

    console.log(`[MCP] Executing operation: ${resourceType}/${operation}`);

    // 根據操作類型調用相應的處理邏輯
    switch (operation) {
      case "create":
        return await this.handleCreate(resourceType, input);
      case "read":
        return await this.handleRead(resourceType, input);
      case "update":
        return await this.handleUpdate(resourceType, input);
      case "delete":
        return await this.handleDelete(resourceType, input);
      case "search":
        return await this.handleSearch(resourceType, input);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private async handleCreate(resourceType: string, input: Record<string, any>): Promise<any> {
    // 將被子類或具體實現覆蓋
    return { success: true, message: `${resourceType} created` };
  }

  private async handleRead(resourceType: string, input: Record<string, any>): Promise<any> {
    return { success: true, message: `${resourceType} read` };
  }

  private async handleUpdate(resourceType: string, input: Record<string, any>): Promise<any> {
    return { success: true, message: `${resourceType} updated` };
  }

  private async handleDelete(resourceType: string, input: Record<string, any>): Promise<any> {
    return { success: true, message: `${resourceType} deleted` };
  }

  private async handleSearch(resourceType: string, input: Record<string, any>): Promise<any> {
    return { success: true, results: [], message: `${resourceType} search completed` };
  }

  /**
   * 獲取所有註冊的服務器
   */
  getServers(): Map<string, MCPServerConfig> {
    return new Map(this.servers);
  }

  /**
   * 獲取所有資源處理器
   */
  getResourceHandlers(): Map<string, MCPResourceHandler> {
    return new Map(this.resourceHandlers);
  }

  /**
   * 健康檢查
   */
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};

    for (const [name, config] of this.servers) {
      try {
        // 簡單的健康檢查：檢查服務器是否已配置
        results[name] = config.enabled;
      } catch (error) {
        results[name] = false;
      }
    }

    return results;
  }
}

/**
 * 預定義的 MCP 服務器配置
 */
export const MCPServerRegistry = {
  // Notion 集成
  notion: {
    name: "Notion",
    command: "notion-mcp-server",
    args: ["--auth-token", process.env.NOTION_API_KEY || ""],
    enabled: !!process.env.NOTION_API_KEY,
    resourceHandlers: [
      {
        type: "notion_page",
        operations: [
          { name: "create", requiresAuth: true },
          { name: "read", requiresAuth: true },
          { name: "update", requiresAuth: true },
          { name: "delete", requiresAuth: true },
          { name: "search", requiresAuth: true },
        ],
      },
      {
        type: "notion_database",
        operations: [
          { name: "read", requiresAuth: true },
          { name: "search", requiresAuth: true },
        ],
      },
    ],
  } as MCPServerConfig,

  // GitHub 集成
  github: {
    name: "GitHub",
    command: "github-mcp-server",
    args: ["--token", process.env.GITHUB_TOKEN || ""],
    enabled: !!process.env.GITHUB_TOKEN,
    resourceHandlers: [
      {
        type: "github_issue",
        operations: [
          { name: "create", requiresAuth: true },
          { name: "read", requiresAuth: true },
          { name: "update", requiresAuth: true },
          { name: "search", requiresAuth: true },
        ],
      },
      {
        type: "github_repo",
        operations: [
          { name: "read", requiresAuth: true },
          { name: "search", requiresAuth: true },
        ],
      },
    ],
  } as MCPServerConfig,

  // 本地文件系統
  filesystem: {
    name: "Filesystem",
    command: "fs-mcp-server",
    enabled: true,
    resourceHandlers: [
      {
        type: "file",
        operations: [
          { name: "create", requiresAuth: false },
          { name: "read", requiresAuth: false },
          { name: "update", requiresAuth: false },
          { name: "delete", requiresAuth: false },
          { name: "search", requiresAuth: false },
        ],
      },
      {
        type: "directory",
        operations: [
          { name: "read", requiresAuth: false },
          { name: "search", requiresAuth: false },
        ],
      },
    ],
  } as MCPServerConfig,

  // Obsidian 集成
  obsidian: {
    name: "Obsidian",
    command: "obsidian-mcp-server",
    args: ["--vault", process.env.OBSIDIAN_VAULT_PATH || ""],
    enabled: !!process.env.OBSIDIAN_VAULT_PATH,
    resourceHandlers: [
      {
        type: "obsidian_note",
        operations: [
          { name: "create", requiresAuth: false },
          { name: "read", requiresAuth: false },
          { name: "update", requiresAuth: false },
          { name: "delete", requiresAuth: false },
          { name: "search", requiresAuth: false },
        ],
      },
    ],
  } as MCPServerConfig,
};
