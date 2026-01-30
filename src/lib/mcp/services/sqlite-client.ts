// src/lib/mcp/services/sqlite-client.ts
// SQLite 數據庫服務客戶端

import { BaseMCPServiceClient } from './base-client';
import { MCPActionType } from '../types';
import { PrismaClient } from '@prisma/client';

/**
 * SQLite 數據庫客戶端
 */
export class SQLiteClient extends BaseMCPServiceClient {
  private prisma: PrismaClient | null = null;

  constructor() {
    super('SQLite', 'sqlite');
  }

  /**
   * 驗證配置
   */
  protected async validateConfig(): Promise<void> {
    // SQLite 使用應用的主 Prisma 實例
    // 配置驗證在連接時進行
  }

  /**
   * 建立連接
   */
  protected async establishConnection(): Promise<void> {
    this.prisma = new PrismaClient();
    await this.performHealthCheck();
  }

  /**
   * 關閉連接
   */
  protected async closeConnection(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }

  /**
   * 執行健康檢查
   */
  protected async performHealthCheck(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    try {
      // 簡單查詢測試連接
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new Error(`SQLite health check failed: ${error}`);
    }
  }

  /**
   * 執行操作
   */
  protected async executeAction(action: MCPActionType, input: any): Promise<any> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    switch (action) {
      case 'query':
        return this.executeQuery(input.sql, input.params);

      case 'create':
        return this.createRecord(input.table, input.data);

      case 'update':
        return this.updateRecord(input.table, input.where, input.data);

      case 'delete':
        return this.deleteRecord(input.table, input.where);

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  /**
   * 執行 SQL 查詢
   */
  private async executeQuery(sql: string, params?: any[]): Promise<any> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    // 使用 Prisma 的原始查詢
    const result = await this.prisma.$queryRawUnsafe(sql, ...(params || []));

    return {
      rows: result,
      count: Array.isArray(result) ? result.length : 1,
    };
  }

  /**
   * 創建記錄
   */
  private async createRecord(table: string, data: any): Promise<any> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    // 根據表名動態執行
    const model = (this.prisma as any)[table];
    if (!model) {
      throw new Error(`Unknown table: ${table}`);
    }

    const result = await model.create({ data });

    return {
      table,
      record: result,
      created: true,
    };
  }

  /**
   * 更新記錄
   */
  private async updateRecord(table: string, where: any, data: any): Promise<any> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    const model = (this.prisma as any)[table];
    if (!model) {
      throw new Error(`Unknown table: ${table}`);
    }

    const result = await model.updateMany({ where, data });

    return {
      table,
      count: result.count,
      updated: true,
    };
  }

  /**
   * 刪除記錄
   */
  private async deleteRecord(table: string, where: any): Promise<any> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    const model = (this.prisma as any)[table];
    if (!model) {
      throw new Error(`Unknown table: ${table}`);
    }

    const result = await model.deleteMany({ where });

    return {
      table,
      count: result.count,
      deleted: true,
    };
  }
}
