/**
 * Google Gemini AI 提供商實現
 */

import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from "@google/generative-ai";
import fs from "fs";
import { BaseAIProvider } from "./base";
import { ProcessedNote, SuggestionResult, AIConfig } from "../types";

export class GeminiProvider extends BaseAIProvider {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(config: AIConfig) {
    super(config);
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.modelName || "gemini-2.0-flash",
    });
  }

  async processNote(filePath: string, mimeType: string = "image/jpeg"): Promise<ProcessedNote> {
    this.checkRateLimit();

    const imagePart = this.fileToGenerativePart(filePath, mimeType);
    const prompt = `
    You are an expert archivist digitizing handwritten notes.
    請執行以下步驟，並確保所有中文輸出（包括摘要與標籤）為繁體中文。

    1. **OCR**: 準確轉錄圖片中的文字，保留原始換行符。
    2. **Refinement**: 創建一個清晰、校正後的 Markdown 版本。修正拼寫錯誤、改進標點符號，並根據佈局組織標題/列表。
    3. **Analysis**: 生成一個簡短的摘要（1-2 句話）和 3-5 個相關標籤。
    4. **Confidence**: 根據文字的清晰度，估計一個信心分數（0.0 到 1.0）。

    請嚴格以有效的 JSON 格式輸出，不要包含程式碼區塊：
    {
      "rawOcr": "...",
      "refinedContent": "...",
      "summary": "...",
      "tags": ["tag1", "tag2"],
      "confidence": 0.95
    }
    `;

    return this.retry(async () => {
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      const jsonStr = this.sanitizeJSON(text);
      return JSON.parse(jsonStr) as ProcessedNote;
    }, 3);
  }

  async generateSuggestions(text: string): Promise<SuggestionResult[]> {
    this.checkRateLimit();

    const prompt = `根據以下筆記內容，提供 3-5 條有用的建議。建議應該具體、可行、且與內容高度相關。
\n筆記內容：${text}\n\n
以 JSON 陣列格式輸出，每條建議包含 title、description 和 type 屬性（type 可以是 "insight", "action", "tag" 或 "related"）。`;

    return this.retry(async () => {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonStr = this.sanitizeJSON(text);
      return JSON.parse(jsonStr) as SuggestionResult[];
    });
  }

  async generateTags(text: string): Promise<string[]> {
    this.checkRateLimit();

    const prompt = `根據以下文本內容，生成 3-5 個相關的標籤。標籤應該簡潔、具有描述性。
\n內容：${text.substring(0, 500)}\n\n
以 JSON 陣列格式輸出，只包含標籤字符串，例如：["標籤1", "標籤2", "標籤3"]`;

    return this.retry(async () => {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonStr = this.sanitizeJSON(text);
      return JSON.parse(jsonStr) as string[];
    });
  }

  async generateSummary(text: string): Promise<string> {
    this.checkRateLimit();

    const prompt = `請用 1-2 句繁體中文總結以下內容：\n${text.substring(0, 500)}`;

    return this.retry(async () => {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.model.generateContent("Hello");
      return !!result.response;
    } catch (error) {
      console.error("Gemini health check failed:", error);
      return false;
    }
  }

  private fileToGenerativePart(path: string, mimeType: string) {
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(path)).toString("base64"),
        mimeType,
      },
    };
  }
}
