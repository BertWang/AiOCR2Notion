/**
 * 模組系統 - 允許自定義擴展功能
 */

import { ModuleInterface, ModuleRegistry, ModuleContext, ModuleCache } from "./ai-service/types";

export class ModuleSystem {
  private modules: ModuleRegistry = {};
  private cache: ModuleCache;

  constructor() {
    this.cache = this.createCache();
  }

  /**
   * 創建簡單的內存緩存
   */
  private createCache(): ModuleCache {
    const store = new Map<string, { value: any; expiry?: number }>();

    return {
      get: (key: string) => {
        const item = store.get(key);
        if (!item) return undefined;
        if (item.expiry && item.expiry < Date.now()) {
          store.delete(key);
          return undefined;
        }
        return item.value;
      },
      set: (key: string, value: any, ttl?: number) => {
        const expiry = ttl ? Date.now() + ttl : undefined;
        store.set(key, { value, expiry });
      },
      del: (key: string) => {
        store.delete(key);
      },
    };
  }

  /**
   * 註冊模組
   */
  async registerModule(module: ModuleInterface, config?: Record<string, any>): Promise<void> {
    console.log(`[Module] Registering: ${module.name} v${module.version}`);

    if (this.modules[module.name]) {
      throw new Error(`Module ${module.name} already registered`);
    }

    // 初始化模組
    const moduleContext: ModuleContext = {
      logger: this.createLogger(module.name),
      config: config || {},
      cache: this.cache,
    };

    await module.init(moduleContext);
    this.modules[module.name] = module;

    console.log(`[Module] Registered: ${module.name}`);
  }

  /**
   * 執行模組
   */
  async executeModule(moduleName: string, input: any): Promise<any> {
    const module = this.modules[moduleName];
    if (!module) {
      throw new Error(`Module ${moduleName} not found`);
    }

    console.log(`[Module] Executing: ${moduleName}`);

    // 驗證輸入（如果模組提供了驗證函數）
    if (module.validate && !module.validate(input)) {
      throw new Error(`Invalid input for module ${moduleName}`);
    }

    const context: ModuleContext = {
      logger: this.createLogger(moduleName),
      config: {},
      cache: this.cache,
    };

    return module.execute(input, context);
  }

  /**
   * 獲取已註冊的模組
   */
  getModule(name: string): ModuleInterface | undefined {
    return this.modules[name];
  }

  /**
   * 列出所有已註冊的模組
   */
  listModules(): ModuleInterface[] {
    return Object.values(this.modules);
  }

  /**
   * 卸載模組
   */
  unloadModule(name: string): void {
    if (this.modules[name]) {
      delete this.modules[name];
      console.log(`[Module] Unloaded: ${name}`);
    }
  }

  /**
   * 獲取按類型分組的模組
   */
  getModulesByType(type: string): ModuleInterface[] {
    return Object.values(this.modules).filter(m => m.type === type);
  }

  /**
   * 創建記錄器
   */
  private createLogger(moduleName: string) {
    return {
      info: (message: string, meta?: Record<string, any>) => {
        console.log(`[${moduleName}] INFO: ${message}`, meta || "");
      },
      error: (message: string, error?: Error, meta?: Record<string, any>) => {
        console.error(`[${moduleName}] ERROR: ${message}`, error || "", meta || "");
      },
      warn: (message: string, meta?: Record<string, any>) => {
        console.warn(`[${moduleName}] WARN: ${message}`, meta || "");
      },
      debug: (message: string, meta?: Record<string, any>) => {
        if (process.env.DEBUG) {
          console.debug(`[${moduleName}] DEBUG: ${message}`, meta || "");
        }
      },
    };
  }
}

/**
 * 內置模組示例
 */
export class TextCleanupModule implements ModuleInterface {
  name = "TextCleanupModule";
  version = "1.0.0";
  type: "processor" = "processor";

  async init(config: ModuleContext): Promise<void> {
    config.logger.info("TextCleanupModule initialized");
  }

  execute(input: any): Promise<any> {
    // 清理文本中的特殊字符和多余空格
    if (typeof input !== "string") {
      throw new Error("Input must be a string");
    }

    const cleaned = input
      .replace(/\s+/g, " ") // 多余空格
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // 零寬字符
      .trim();

    return Promise.resolve(cleaned);
  }

  validate(input: any): boolean {
    return typeof input === "string" && input.length > 0;
  }
}

export class TaggingModule implements ModuleInterface {
  name = "TaggingModule";
  version = "1.0.0";
  type: "processor" = "processor";

  async init(config: ModuleContext): Promise<void> {
    config.logger.info("TaggingModule initialized");
  }

  async execute(input: any, context: ModuleContext): Promise<string[]> {
    // 簡單的標籤提取邏輯
    if (typeof input !== "string") {
      throw new Error("Input must be a string");
    }

    const tags = [
      ...new Set(
        input
          .match(/#[\w\u4e00-\u9fff]+/g)
          ?.map(tag => tag.slice(1))
          .slice(0, 5) || []
      ),
    ];

    context.logger.info(`Extracted ${tags.length} tags`, { tags });
    return tags;
  }

  validate(input: any): boolean {
    return typeof input === "string";
  }
}
