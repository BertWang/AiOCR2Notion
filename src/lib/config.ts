/**
 * AI 和模組配置管理配置文件
 * 允許用戶配置系統行為
 */

import { AIProviderType, ProcessingStage } from "@/lib/ai-service/types";

/**
 * AI 提供商配置
 */
export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  modelName: string;
  enabled: boolean;
  priority: number; // 優先級（1 = 最高）
  fallback?: boolean; // 是否作為備用提供商
}

/**
 * 處理管道配置
 */
export interface PipelineStageConfig {
  name: string;
  enabled: boolean;
  processor: string; // 使用哪個 AI 提供商或模組
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

/**
 * 系統配置
 */
export const SYSTEM_CONFIG = {
  // AI 提供商配置
  aiProviders: [
    {
      provider: "gemini" as AIProviderType,
      apiKey: process.env.GEMINI_API_KEY || "",
      modelName: process.env.AI_MODEL || "gemini-2.0-flash",
      enabled: !!process.env.GEMINI_API_KEY,
      priority: 1,
    },
    {
      provider: "openai" as AIProviderType,
      apiKey: process.env.OPENAI_API_KEY || "",
      modelName: process.env.OPENAI_MODEL || "gpt-4-vision-preview",
      enabled: !!process.env.OPENAI_API_KEY,
      priority: 2,
      fallback: true,
    },
  ] as AIProviderConfig[],

  // 處理管道配置
  processingPipeline: [
    {
      name: "OCR Processing",
      enabled: true,
      processor: "gemini",
      timeout: 30000,
      retryOnFailure: true,
      maxRetries: 3,
    },
    {
      name: "Text Cleanup",
      enabled: true,
      processor: "TextCleanupModule",
      timeout: 15000,
      retryOnFailure: true,
      maxRetries: 2,
    },
    {
      name: "Tagging",
      enabled: true,
      processor: "TaggingModule",
      timeout: 10000,
      retryOnFailure: true,
      maxRetries: 2,
    },
    {
      name: "Classification",
      enabled: true,
      processor: "gemini",
      timeout: 10000,
      retryOnFailure: true,
      maxRetries: 2,
    },
  ] as PipelineStageConfig[],

  // MCP 服務器配置
  mcpServers: [
    {
      name: "Notion",
      enabled: !!process.env.NOTION_API_KEY,
      apiKey: process.env.NOTION_API_KEY,
    },
    {
      name: "GitHub",
      enabled: !!process.env.GITHUB_TOKEN,
      token: process.env.GITHUB_TOKEN,
    },
    {
      name: "Filesystem",
      enabled: true,
    },
  ],

  // 全局速率限制
  rateLimit: {
    aiRequestsPerMinute: 5,
    searchRequestsPerMinute: 30,
    apiRequestsPerMinute: 100,
  },

  // 日誌級別
  logLevel: process.env.LOG_LEVEL || "info",

  // 特性開關
  features: {
    enableAISuggestions: true,
    enableSemanticSearch: false, // 待實現
    enableRealtimeSync: false, // 待實現
    enableAutoTagging: true,
    enableAutoSummarization: true,
  },
};

/**
 * 環境變數映射
 */
export const ENVIRONMENT_VARIABLES = {
  // AI 提供商
  GEMINI_API_KEY: "Google Gemini API 金鑰",
  OPENAI_API_KEY: "OpenAI API 金鑰",
  AZURE_OPENAI_KEY: "Azure OpenAI 金鑰",
  AZURE_OPENAI_ENDPOINT: "Azure OpenAI 端點",
  CLAUDE_API_KEY: "Anthropic Claude API 金鑰",

  // MCP 服務器
  NOTION_API_KEY: "Notion Integration Token",
  GITHUB_TOKEN: "GitHub Personal Access Token",
  OBSIDIAN_VAULT_PATH: "Obsidian 知識庫路徑",

  // 數據庫
  DATABASE_URL: "Prisma 數據庫連接字符串",

  // 系統
  LOG_LEVEL: "日誌級別 (debug|info|warn|error)",
  NODE_ENV: "環境 (development|production)",
};

/**
 * 導出配置驗證函數
 */
export function validateConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 檢查是否至少有一個 AI 提供商已啟用
  const enabledProviders = (config.aiProviders || []).filter(
    (p: AIProviderConfig) => p.enabled
  );
  if (enabledProviders.length === 0) {
    errors.push("At least one AI provider must be enabled");
  }

  // 檢查處理管道配置
  if (config.processingPipeline) {
    const enabledStages = config.processingPipeline.filter(
      (s: PipelineStageConfig) => s.enabled
    );
    if (enabledStages.length === 0) {
      errors.push("At least one processing stage must be enabled");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
