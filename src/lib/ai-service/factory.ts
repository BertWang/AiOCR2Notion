/**
 * AI 服務工廠 - 根據配置動態創建提供商
 */

import { AIProviderInterface, AIConfig, AIProviderType } from "./types";
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai";

export class AIProviderFactory {
  private static providers = new Map<string, AIProviderInterface>();
  private static configs = new Map<AIProviderType, AIConfig>();

  static registerConfig(providerType: AIProviderType, config: AIConfig): void {
    this.configs.set(providerType, config);
  }

  static getConfig(providerType: AIProviderType): AIConfig | undefined {
    return this.configs.get(providerType);
  }

  static createProvider(config: AIConfig): AIProviderInterface {
    const cacheKey = `${config.provider}-${config.modelName}`;

    // 返回緩存的提供商
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    let provider: AIProviderInterface;

    switch (config.provider) {
      case "gemini":
        provider = new GeminiProvider(config);
        break;
      case "openai":
        provider = new OpenAIProvider(config);
        break;
      case "azure":
        // 待實現 Azure OpenAI 提供商
        throw new Error("Azure provider not yet implemented");
      case "claude":
        // 待實現 Anthropic Claude 提供商
        throw new Error("Claude provider not yet implemented");
      case "custom":
        // 待實現自定義提供商加載邏輯
        throw new Error("Custom provider not yet implemented");
      default:
        throw new Error(`Unknown AI provider: ${config.provider}`);
    }

    // 緩存提供商
    this.providers.set(cacheKey, provider);
    return provider;
  }

  static getDefaultProvider(): AIProviderInterface {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("No AI provider configured. Set GEMINI_API_KEY or configure custom provider.");
    }

    const config: AIConfig = {
      provider: "gemini",
      apiKey: geminiApiKey,
      modelName: process.env.AI_MODEL || "gemini-2.0-flash",
    };

    return this.createProvider(config);
  }

  static clearCache(): void {
    this.providers.clear();
  }
}
