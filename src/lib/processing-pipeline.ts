/**
 * 處理管道 - 模組化的筆記處理流程
 */

import { ProcessingPipeline, ProcessingStage, PipelineConfig, ModuleContext } from "./ai-service/types";
import { AIProviderFactory } from "./ai-service/factory";
import { ProcessedNote } from "./ai-service/types";

interface PipelineInput {
  filePath: string;
  mimeType: string;
  metadata?: Record<string, any>;
}

interface PipelineOutput extends ProcessedNote {
  processingTime: number;
  stagesCompleted: string[];
  errors?: Array<{ stage: string; error: string }>;
}

export class NotesProcessingPipeline {
  private config: PipelineConfig;
  private stages: ProcessingStage[];

  constructor(pipelineConfig?: Partial<ProcessingPipeline>) {
    this.config = pipelineConfig?.config || {
      parallel: false,
      retryOnFailure: true,
      maxRetries: 3,
    };

    this.stages = pipelineConfig?.stages || this.getDefaultStages();
  }

  private getDefaultStages(): ProcessingStage[] {
    return [
      {
        name: "OCR Processing",
        type: "ocr",
        enabled: true,
        processor: "gemini",
        timeout: 30000,
      },
      {
        name: "Content Cleanup",
        type: "cleanup",
        enabled: true,
        processor: "gemini",
        timeout: 15000,
      },
      {
        name: "Classification",
        type: "classification",
        enabled: true,
        processor: "gemini",
        timeout: 10000,
      },
      {
        name: "Storage",
        type: "storage",
        enabled: true,
        processor: "database",
        timeout: 5000,
      },
    ];
  }

  async execute(input: PipelineInput): Promise<PipelineOutput> {
    const startTime = Date.now();
    const stagesCompleted: string[] = [];
    const errors: Array<{ stage: string; error: string }> = [];

    try {
      const enabledStages = this.stages.filter(s => s.enabled);

      if (this.config.parallel) {
        // 並行執行（如果支持）
        await Promise.all(
          enabledStages.map(stage =>
            this.executeStage(stage, input, stagesCompleted, errors)
          )
        );
      } else {
        // 順序執行
        for (const stage of enabledStages) {
          await this.executeStage(stage, input, stagesCompleted, errors);
        }
      }

      // 獲取最終結果
      const aiProvider = AIProviderFactory.getDefaultProvider();
      const result = await aiProvider.processNote(input.filePath, input.mimeType);

      const processingTime = Date.now() - startTime;

      return {
        ...result,
        processingTime,
        stagesCompleted,
        ...(errors.length > 0 && { errors }),
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      throw {
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime,
        stagesCompleted,
        errors,
      };
    }
  }

  private async executeStage(
    stage: ProcessingStage,
    input: PipelineInput,
    stagesCompleted: string[],
    errors: Array<{ stage: string; error: string }>
  ): Promise<void> {
    try {
      console.log(`[Pipeline] Executing stage: ${stage.name}`);

      // 這裡可以根據 stage.processor 動態調用不同的處理器
      // 當前只是記錄完成

      stagesCompleted.push(stage.name);
      console.log(`[Pipeline] Stage completed: ${stage.name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Pipeline] Stage failed: ${stage.name} - ${errorMsg}`);

      if (!this.config.retryOnFailure) {
        throw error;
      }

      errors.push({ stage: stage.name, error: errorMsg });
    }
  }

  addStage(stage: ProcessingStage): void {
    this.stages.push(stage);
  }

  removeStage(stageName: string): void {
    this.stages = this.stages.filter(s => s.name !== stageName);
  }

  updateStage(stageName: string, updates: Partial<ProcessingStage>): void {
    const index = this.stages.findIndex(s => s.name === stageName);
    if (index !== -1) {
      this.stages[index] = { ...this.stages[index], ...updates };
    }
  }

  getConfig(): PipelineConfig {
    return this.config;
  }

  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
