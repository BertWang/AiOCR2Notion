/**
 * AI 服務基類 - 所有提供商的父類
 */

import { AIProviderInterface, ProcessedNote, SuggestionResult, AIConfig } from "../types";

export abstract class BaseAIProvider implements AIProviderInterface {
  protected config: AIConfig;
  protected rateLimitInfo = {
    requestCount: 0,
    lastReset: Date.now(),
    limit: 100, // 每分鐘請求數
  };

  constructor(config: AIConfig) {
    this.config = config;
  }

  abstract processNote(filePath: string, mimeType: string): Promise<ProcessedNote>;
  abstract generateSuggestions(text: string): Promise<SuggestionResult[]>;
  abstract generateTags(text: string): Promise<string[]>;
  abstract generateSummary(text: string): Promise<string>;
  abstract healthCheck(): Promise<boolean>;

  protected checkRateLimit(): void {
    const now = Date.now();
    if (now - this.rateLimitInfo.lastReset > 60 * 1000) {
      this.rateLimitInfo.requestCount = 0;
      this.rateLimitInfo.lastReset = now;
    }

    if (this.rateLimitInfo.requestCount >= this.rateLimitInfo.limit) {
      throw new Error(
        `Rate limit exceeded for ${this.config.provider}. ` +
        `Max ${this.rateLimitInfo.limit} requests per minute.`
      );
    }

    this.rateLimitInfo.requestCount++;
  }

  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * delay;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  protected sanitizeJSON(jsonString: string): string {
    return jsonString
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .trim();
  }
}
