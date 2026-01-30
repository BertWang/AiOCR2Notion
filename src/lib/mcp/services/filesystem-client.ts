// src/lib/mcp/services/filesystem-client.ts
// 文件系統服務客戶端

import { BaseMCPServiceClient } from './base-client';
import { MCPActionType } from '../types';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 文件系統客戶端
 */
export class FilesystemClient extends BaseMCPServiceClient {
  private basePath: string = '';

  constructor() {
    super('Filesystem', 'filesystem');
  }

  /**
   * 驗證配置
   */
  protected async validateConfig(): Promise<void> {
    const config = this.config.config as any;
    if (!config?.basePath) {
      throw new Error('Base path is required for filesystem operations');
    }

    this.basePath = config.basePath;

    // 驗證路徑存在
    try {
      await fs.access(this.basePath);
    } catch {
      throw new Error(`Base path does not exist: ${this.basePath}`);
    }
  }

  /**
   * 建立連接
   */
  protected async establishConnection(): Promise<void> {
    await this.performHealthCheck();
  }

  /**
   * 關閉連接
   */
  protected async closeConnection(): Promise<void> {
    // 文件系統無需顯式關閉
  }

  /**
   * 執行健康檢查
   */
  protected async performHealthCheck(): Promise<void> {
    try {
      await fs.access(this.basePath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      throw new Error(`Filesystem health check failed: ${error}`);
    }
  }

  /**
   * 執行操作
   */
  protected async executeAction(action: MCPActionType, input: any): Promise<any> {
    switch (action) {
      case 'query':
        return this.listFiles(input.path, input.options);

      case 'create':
        return this.writeFile(input.path, input.content, input.options);

      case 'process':
        return this.readFile(input.path, input.options);

      case 'delete':
        return this.deleteFile(input.path);

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  /**
   * 列出文件
   */
  private async listFiles(dirPath: string, options?: any): Promise<any> {
    const fullPath = path.join(this.basePath, dirPath);
    
    // 安全檢查
    if (!fullPath.startsWith(this.basePath)) {
      throw new Error('Path traversal detected');
    }

    const files = await fs.readdir(fullPath, { withFileTypes: true });

    return {
      path: dirPath,
      files: files.map((file) => ({
        name: file.name,
        isDirectory: file.isDirectory(),
        isFile: file.isFile(),
      })),
    };
  }

  /**
   * 寫入文件
   */
  private async writeFile(filePath: string, content: string, options?: any): Promise<any> {
    const fullPath = path.join(this.basePath, filePath);

    // 安全檢查
    if (!fullPath.startsWith(this.basePath)) {
      throw new Error('Path traversal detected');
    }

    // 確保目錄存在
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    await fs.writeFile(fullPath, content, options?.encoding || 'utf8');

    return {
      path: filePath,
      size: Buffer.byteLength(content),
      created: true,
    };
  }

  /**
   * 讀取文件
   */
  private async readFile(filePath: string, options?: any): Promise<any> {
    const fullPath = path.join(this.basePath, filePath);

    // 安全檢查
    if (!fullPath.startsWith(this.basePath)) {
      throw new Error('Path traversal detected');
    }

    const content = await fs.readFile(fullPath, options?.encoding || 'utf8');
    const stats = await fs.stat(fullPath);

    return {
      path: filePath,
      content,
      size: stats.size,
      modified: stats.mtime,
    };
  }

  /**
   * 刪除文件
   */
  private async deleteFile(filePath: string): Promise<any> {
    const fullPath = path.join(this.basePath, filePath);

    // 安全檢查
    if (!fullPath.startsWith(this.basePath)) {
      throw new Error('Path traversal detected');
    }

    await fs.unlink(fullPath);

    return {
      path: filePath,
      deleted: true,
    };
  }
}
