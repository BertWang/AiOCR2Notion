/**
 * AI 服務層 - 統一接口定義
 * 支持多個 AI 提供商的抽象層
 */

export type AIProviderType = "gemini" | "openai" | "azure" | "claude" | "custom";

export interface AIConfig {
  provider: AIProviderType;
  apiKey: string;
  modelName: string;
  baseUrl?: string; // 用於自定義端點
  config?: Record<string, any>; // 提供商特定配置
}

export interface ProcessedNote {
  rawOcr: string;
  refinedContent: string;
  summary: string;
  tags: string[];
  confidence: number;
}

export interface AIProviderInterface {
  // OCR 和內容處理
  processNote(filePath: string, mimeType: string): Promise<ProcessedNote>;

  // 生成建議
  generateSuggestions(text: string): Promise<SuggestionResult[]>;

  // 生成標籤
  generateTags(text: string): Promise<string[]>;

  // 生成摘要
  generateSummary(text: string): Promise<string>;

  // 健康檢查
  healthCheck(): Promise<boolean>;

  // 獲取 API 使用情況（如果支持）
  getUsage?(): Promise<APIUsage>;
}

export interface SuggestionResult {
  title: string;
  description: string;
  type?: "insight" | "action" | "tag" | "related";
}

export interface APIUsage {
  requestsToday: number;
  requestsThisMonth: number;
  quotaLimit: number;
  resetTime?: Date;
}

export interface ProcessingPipeline {
  stages: ProcessingStage[];
  config: PipelineConfig;
}

export interface ProcessingStage {
  name: string;
  type: "ocr" | "cleanup" | "analysis" | "classification" | "storage" | "custom";
  enabled: boolean;
  processor: string; // AI 服務或自定義處理器
  timeout?: number; // 毫秒
}

export interface PipelineConfig {
  parallel: boolean; // 是否並行執行階段
  retryOnFailure: boolean;
  maxRetries: number;
  fallbackChain?: string[]; // 備用 AI 服務列表
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
  resourceHandlers?: MCPResourceHandler[];
}

export interface MCPResourceHandler {
  type: string; // 如 "note", "search", "collection"
  operations: MCPOperation[];
}

export interface MCPOperation {
  name: string; // create, read, update, delete, search
  description?: string;
  requiresAuth: boolean;
}

export interface ModuleRegistry {
  [moduleName: string]: ModuleInterface;
}

export interface ModuleInterface {
  name: string;
  version: string;
  type: "ai" | "processor" | "storage" | "integration" | "ui";
  init(config: Record<string, any>): Promise<void>;
  execute(input: any, context: ModuleContext): Promise<any>;
  validate?(input: any): boolean;
}

export interface ModuleContext {
  logger: Logger;
  config: Record<string, any>;
  cache?: ModuleCache;
}

export interface ModuleCache {
  get(key: string): any;
  set(key: string, value: any, ttl?: number): void;
  del(key: string): void;
}

export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}
