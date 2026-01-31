/**
 * OCR 提供商管理器 - 處理多提供商優先級和故障轉移邏輯
 * 方案 B: 完整多提供商支持
 */

import { prisma } from '@/lib/prisma';
import { AIProviderFactory } from '@/lib/ai-service/factory';
import { AIProviderInterface, AIConfig } from '@/lib/ai-service/types';

export interface OCRProviderInstance {
  provider: string;
  priority: number;
  enabled: boolean;
  isDefault: boolean;
  apiKey?: string | null;
  endpoint?: string | null;
  config?: Record<string, any>;
}

export interface ProcessNoteResult {
  rawOcr: string;
  refinedContent: string;
  summary: string;
  tags: string[];
  confidence: number;
  usedProvider: string;
  executionTimeMs: number;
}

export class OCRProviderManager {
  /**
   * 獲取優先級排序的提供商列表
   */
  static async getProvidersByPriority(): Promise<OCRProviderInstance[]> {
    const providers = await prisma.oCRProviderSetting.findMany({
      where: { enabled: true },
      orderBy: { priority: 'asc' },
    });

    return providers.map(p => ({
      provider: p.provider,
      priority: p.priority,
      enabled: p.enabled,
      isDefault: p.isDefault,
      apiKey: p.apiKey,
      endpoint: p.endpoint,
      config: p.config ? JSON.parse(p.config) : undefined,
    }));
  }

  /**
   * 獲取默認提供商
   */
  static async getDefaultProvider(): Promise<OCRProviderInstance | null> {
    const settings = await prisma.oCRProviderSetting.findFirst({
      where: { isDefault: true, enabled: true },
    });

    if (!settings) return null;

    return {
      provider: settings.provider,
      priority: settings.priority,
      enabled: settings.enabled,
      isDefault: settings.isDefault,
      apiKey: settings.apiKey,
      endpoint: settings.endpoint,
      config: settings.config ? JSON.parse(settings.config) : undefined,
    };
  }

  /**
   * 處理筆記 - 支持故障轉移
   * 依次嘗試提供商列表，直到成功
   */
  static async processNoteWithFailover(
    filepath: string,
    mimeType: string,
    originalNoteId?: string
  ): Promise<ProcessNoteResult> {
    const providers = await this.getProvidersByPriority();

    if (providers.length === 0) {
      throw new Error('沒有啟用的 OCR 提供商');
    }

    let lastError: Error | null = null;

    for (const providerConfig of providers) {
      try {
        console.log(`🔄 嘗試 OCR 提供商: ${providerConfig.provider}`);

        const aiProvider = this.createProviderInstance(providerConfig);
        const startTime = Date.now();
        const aiResult = await aiProvider.processNote(filepath, mimeType);
        const executionTimeMs = Date.now() - startTime;

        // 更新提供商統計
        await this.updateProviderStats(providerConfig.provider, {
          success: true,
          responseTimeMs: executionTimeMs,
        });

        console.log(`✅ OCR 成功: ${providerConfig.provider} (${executionTimeMs}ms)`);

        return {
          ...aiResult,
          usedProvider: providerConfig.provider,
          executionTimeMs,
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `⚠️ OCR 提供商失敗: ${providerConfig.provider} - ${(error as Error).message}`
        );

        // 更新提供商錯誤狀態
        await this.updateProviderStats(providerConfig.provider, {
          success: false,
          errorMessage: (error as Error).message,
        });

        // 繼續嘗試下一個提供商
        continue;
      }
    }

    // 所有提供商都失敗
    throw new Error(
      `所有 OCR 提供商均失敗。最後錯誤: ${lastError?.message || '未知'}`
    );
  }

  /**
   * 為特定筆記處理 (優先使用原提供商)
   */
  static async processNotePreferOriginal(
    noteId: string,
    filepath: string,
    mimeType: string
  ): Promise<ProcessNoteResult> {
    // 獲取原筆記的提供商
    const originalNote = await prisma.note.findUnique({
      where: { id: noteId },
      select: { ocrProvider: true },
    });

    if (originalNote?.ocrProvider) {
      try {
        console.log(`🔄 優先嘗試原提供商: ${originalNote.ocrProvider}`);

        const providerSetting = await prisma.oCRProviderSetting.findUnique({
          where: { provider: originalNote.ocrProvider },
        });

        if (providerSetting && providerSetting.enabled) {
          const providerConfig: OCRProviderInstance = {
            provider: providerSetting.provider,
            priority: providerSetting.priority,
            enabled: providerSetting.enabled,
            isDefault: providerSetting.isDefault,
            apiKey: providerSetting.apiKey,
            endpoint: providerSetting.endpoint,
            config: providerSetting.config
              ? JSON.parse(providerSetting.config)
              : undefined,
          };

          const aiProvider = this.createProviderInstance(providerConfig);
          const startTime = Date.now();
          const aiResult = await aiProvider.processNote(filepath, mimeType);
          const executionTimeMs = Date.now() - startTime;

          await this.updateProviderStats(providerConfig.provider, {
            success: true,
            responseTimeMs: executionTimeMs,
          });

          return {
            ...aiResult,
            usedProvider: providerConfig.provider,
            executionTimeMs,
          };
        }
      } catch (error) {
        console.warn(
          `⚠️ 原提供商失敗: ${originalNote.ocrProvider} - ${(error as Error).message}`
        );
      }
    }

    // 原提供商失敗或不存在，使用故障轉移
    return this.processNoteWithFailover(filepath, mimeType, noteId);
  }

  /**
   * 創建提供商實例
   */
  private static createProviderInstance(
    config: OCRProviderInstance
  ): AIProviderInterface {
    const aiConfig: AIConfig = {
      provider: config.provider as any,
      apiKey: config.apiKey || process.env[`${config.provider.toUpperCase()}_API_KEY`] || '',
      modelName: config.config?.modelName || config.provider,
      config: config.config,
      baseUrl: config.endpoint || undefined,
    };

    return AIProviderFactory.createProvider(aiConfig);
  }

  /**
   * 更新提供商統計信息
   */
  private static async updateProviderStats(
    provider: string,
    stats: {
      success: boolean;
      responseTimeMs?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      const updates: any = {
        lastUsedAt: new Date(),
      };

      if (stats.success && stats.responseTimeMs !== undefined) {
        updates.status = 'ACTIVE';
        updates.lastErrorMessage = null;
        updates.lastErrorAt = null;

        // 更新平均響應時間 (簡單移動平均)
        const current = await prisma.oCRProviderSetting.findUnique({
          where: { provider },
          select: { avgResponseTimeMs: true },
        });

        if (current?.avgResponseTimeMs) {
          updates.avgResponseTimeMs = Math.round(
            (current.avgResponseTimeMs + stats.responseTimeMs) / 2
          );
        } else {
          updates.avgResponseTimeMs = stats.responseTimeMs;
        }
      } else if (!stats.success) {
        updates.status = 'ERROR';
        updates.lastErrorAt = new Date();
        updates.lastErrorMessage = stats.errorMessage || 'Unknown error';
      }

      await prisma.oCRProviderSetting.update({
        where: { provider },
        data: updates,
      });
    } catch (error) {
      console.error(`Failed to update provider stats for ${provider}:`, error);
      // 不中斷主流程
    }
  }

  /**
   * 健康檢查 - 測試提供商連接
   */
  static async healthCheck(provider: string): Promise<{
    healthy: boolean;
    message: string;
    responseTimeMs?: number;
  }> {
    try {
      const settings = await prisma.oCRProviderSetting.findUnique({
        where: { provider },
      });

      if (!settings) {
        return { healthy: false, message: `提供商 ${provider} 不存在` };
      }

      const providerConfig: OCRProviderInstance = {
        provider: settings.provider,
        priority: settings.priority,
        enabled: settings.enabled,
        isDefault: settings.isDefault,
        apiKey: settings.apiKey,
        endpoint: settings.endpoint,
        config: settings.config ? JSON.parse(settings.config) : undefined,
      };

      const aiProvider = this.createProviderInstance(providerConfig);

      // 簡單測試 (根據提供商具體實現)
      const startTime = Date.now();
      await aiProvider.testConnection?.();
      const responseTimeMs = Date.now() - startTime;

      return {
        healthy: true,
        message: `${provider} 連接正常`,
        responseTimeMs,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `${provider} 連接失敗: ${(error as Error).message}`,
      };
    }
  }

  /**
   * 獲取所有提供商配置 (包含禁用的)
   */
  static async getAllProviders(): Promise<OCRProviderInstance[]> {
    const providers = await prisma.oCRProviderSetting.findMany({
      orderBy: { priority: 'asc' },
    });

    return providers.map(p => ({
      provider: p.provider,
      priority: p.priority,
      enabled: p.enabled,
      isDefault: p.isDefault,
      apiKey: p.apiKey,
      endpoint: p.endpoint,
      config: p.config ? JSON.parse(p.config) : undefined,
    }));
  }

  /**
   * 更新提供商配置
   */
  static async updateProvider(
    provider: string,
    updates: Partial<{
      enabled: boolean;
      priority: number;
      isDefault: boolean;
      apiKey: string;
      endpoint: string;
      config: Record<string, any>;
      displayName: string;
      description: string;
    }>
  ): Promise<OCRProviderInstance> {
    const data: any = {};

    if (updates.enabled !== undefined) data.enabled = updates.enabled;
    if (updates.priority !== undefined) data.priority = updates.priority;
    if (updates.isDefault !== undefined) data.isDefault = updates.isDefault;
    if (updates.apiKey !== undefined) data.apiKey = updates.apiKey;
    if (updates.endpoint !== undefined) data.endpoint = updates.endpoint;
    if (updates.config !== undefined) data.config = JSON.stringify(updates.config);
    if (updates.displayName !== undefined) data.displayName = updates.displayName;
    if (updates.description !== undefined) data.description = updates.description;

    // 如果設置為默認，清除其他默認設置
    if (updates.isDefault === true) {
      await prisma.oCRProviderSetting.updateMany({
        where: { provider: { not: provider } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.oCRProviderSetting.update({
      where: { provider },
      data,
    });

    return {
      provider: updated.provider,
      priority: updated.priority,
      enabled: updated.enabled,
      isDefault: updated.isDefault,
      apiKey: updated.apiKey,
      endpoint: updated.endpoint,
      config: updated.config ? JSON.parse(updated.config) : undefined,
    };
  }

  /**
   * 計算成本和性能指標
   */
  static async getAnalytics(): Promise<{
    providers: Array<{
      provider: string;
      enabled: boolean;
      priority: number;
      isDefault: boolean;
      avgResponseTimeMs?: number;
      successRate?: number;
      costPerRequest?: number;
      monthlyUsage?: number;
      monthlyQuota?: number;
      status: string;
    }>;
    totalCost: number;
    averageResponseTime: number;
  }> {
    const providers = await prisma.oCRProviderSetting.findMany({
      orderBy: { priority: 'asc' },
    });

    const providerStats = providers.map(p => ({
      provider: p.provider,
      enabled: p.enabled,
      priority: p.priority,
      isDefault: p.isDefault,
      avgResponseTimeMs: p.avgResponseTimeMs || undefined,
      successRate: p.successRate || undefined,
      costPerRequest: p.costPerRequest || undefined,
      monthlyUsage: p.monthlyUsage || undefined,
      monthlyQuota: p.monthlyQuota || undefined,
      status: p.status,
    }));

    const totalCost = providers.reduce(
      (sum, p) => sum + (p.costPerRequest || 0) * (p.monthlyUsage || 0),
      0
    );

    const avgResponseTime =
      providers.length > 0
        ? providers.reduce((sum, p) => sum + (p.avgResponseTimeMs || 0), 0) /
          providers.length
        : 0;

    return {
      providers: providerStats,
      totalCost,
      averageResponseTime: Math.round(avgResponseTime),
    };
  }
}
