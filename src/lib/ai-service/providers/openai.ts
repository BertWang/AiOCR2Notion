/**
 * OpenAI API 提供商實現
 * 支持 GPT-4 Vision、GPT-4 Turbo 等模型
 */

import { BaseAIProvider } from "./base";
import { ProcessedNote, SuggestionResult, AIConfig } from "../types";
import fs from "fs";

export class OpenAIProvider extends BaseAIProvider {
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(config: AIConfig) {
    super(config);
    this.apiBaseUrl = config.baseUrl || "https://api.openai.com/v1";
    this.apiKey = config.apiKey;
  }

  async processNote(filePath: string, mimeType: string = "image/jpeg"): Promise<ProcessedNote> {
    this.checkRateLimit();

    const imageBase64 = Buffer.from(fs.readFileSync(filePath)).toString("base64");

    const prompt = `You are an expert archivist digitizing handwritten notes.
    請執行以下步驟，並確保所有中文輸出為繁體中文。

    1. **OCR**: 準確轉錄圖片中的文字，保留原始換行符。
    2. **Refinement**: 創建一個清晰、校正後的 Markdown 版本。
    3. **Analysis**: 生成一個簡短的摘要（1-2 句話）和 3-5 個相關標籤。
    4. **Confidence**: 根據文字的清晰度，估計一個信心分數（0.0 到 1.0）。

    請嚴格以有效的 JSON 格式輸出：
    {
      "rawOcr": "...",
      "refinedContent": "...",
      "summary": "...",
      "tags": ["tag1", "tag2"],
      "confidence": 0.95
    }`;

    return this.retry(async () => {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.modelName || "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonStr = this.sanitizeJSON(content);
      return JSON.parse(jsonStr) as ProcessedNote;
    }, 3);
  }

  async generateSuggestions(text: string): Promise<SuggestionResult[]> {
    this.checkRateLimit();

    const prompt = `根據以下筆記內容，提供 3-5 條有用的建議。
\n筆記內容：${text}\n\n
以 JSON 陣列格式輸出，每條建議包含 title、description 和 type 屬性。`;

    return this.retry(async () => {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.modelName || "gpt-4-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) throw new Error("OpenAI API error");

      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonStr = this.sanitizeJSON(content);
      return JSON.parse(jsonStr) as SuggestionResult[];
    });
  }

  async generateTags(text: string): Promise<string[]> {
    this.checkRateLimit();

    const prompt = `根據以下文本生成 3-5 個標籤。以 JSON 陣列格式輸出：\n${text.substring(0, 500)}`;

    return this.retry(async () => {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.modelName || "gpt-4-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
        }),
      });

      if (!response.ok) throw new Error("OpenAI API error");

      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonStr = this.sanitizeJSON(content);
      return JSON.parse(jsonStr) as string[];
    });
  }

  async generateSummary(text: string): Promise<string> {
    this.checkRateLimit();

    const prompt = `請用 1-2 句繁體中文總結以下內容：\n${text.substring(0, 500)}`;

    return this.retry(async () => {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.modelName || "gpt-4-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
        }),
      });

      if (!response.ok) throw new Error("OpenAI API error");

      const data = await response.json();
      return data.choices[0].message.content;
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/models`, {
        headers: { "Authorization": `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch (error) {
      console.error("OpenAI health check failed:", error);
      return false;
    }
  }
}
