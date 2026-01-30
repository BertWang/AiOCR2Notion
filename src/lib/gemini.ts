import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from "@google/generative-ai";
import fs from "fs";

// 可用的 Gemini 模型
export const GEMINI_MODELS = {
  FLASH_2_0: "gemini-2.0-flash-exp", // 最新的 2.0 Flash 實驗版
  FLASH_2_0_STABLE: "gemini-2.0-flash", // 2.0 Flash 穩定版
  PRO_1_5: "gemini-1.5-pro", // 1.5 Pro (更強大但較慢)
  FLASH_1_5: "gemini-1.5-flash", // 1.5 Flash (舊版快速模型)
} as const;

// 從環境變數或預設選擇模型
const DEFAULT_MODEL = process.env.GEMINI_MODEL || GEMINI_MODELS.FLASH_2_0;

// 定義 AI 服務介面
interface AIProvider {
  generateSuggestions(text: string): Promise<any[]>;
  processText(prompt: string, imagePart: any): Promise<string>; // 泛型，更彈性
}

// Gemini 服務實作
class GeminiProvider implements AIProvider {
  private apiKey: string;
  private modelName: string;
  private model: any; // any, for flexibility

  constructor(apiKey: string, modelName: string = DEFAULT_MODEL) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({ model: this.modelName });
    console.log(`🤖 Gemini Provider initialized with model: ${this.modelName}`);
  }

  async generateSuggestions(text: string): Promise<any[]> {
    // 實作產生 AI 建議的邏輯 (使用 text 作為輸入)
    // 這部分需要仔細設計提示詞，並確保輸出格式符合預期
    const prompt = `請根據以下筆記內容，提供 3-5 條有用的建議，讓使用者可以更好地組織、理解或利用這些內容。建議應該具體、可行、且與筆記內容高度相關。
\n筆記內容：${text}\n\n請以 JSON 陣列格式輸出，每條建議包含 title 和 description 屬性。`;
    try {
      const result = await this.model.generateContent([prompt]);
      const response = await result.response;
      const suggestionsText = response.text();

      // 嘗試解析 JSON
      try {
        const suggestions = JSON.parse(suggestionsText) as any[];
        return suggestions;
      } catch (e) {
        console.error("建議 JSON 解析失敗", e);
        return []; // 解析失敗，返回空陣列
      }
    } catch (e) {
      console.error("Gemini 建議生成失敗", e);
      return []; // 請求失敗，返回空陣列
    }
  }

  async processText(prompt: string, imagePart: any): Promise<string> {
    try {
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return response.text();
    } catch (e) {
      console.error("Gemini 文字處理失敗", e);
      throw e; // 重新拋出錯誤，讓上層處理
    }
  }
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });

console.log(`🚀 Gemini initialized with model: ${DEFAULT_MODEL}`);

// Function to convert file to GenerativePart
function fileToGenerativePart(path: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

export interface ProcessedNote {
  rawOcr: string;
  refinedContent: string;
  summary: string;
  tags: string[];
  confidence: number;
}

export async function processNoteWithGemini(filePath: string, mimeType: string = "image/jpeg"): Promise<ProcessedNote> {
  const imagePart = fileToGenerativePart(filePath, mimeType);
  const prompt = `
  You are an expert archivist digitizing handwritten notes.\n  請執行以下步驟，並確保所有中文輸出（包括摘要與標籤）為繁體中文。
\n  1. **OCR**: 準確轉錄圖片中的文字，保留原始換行符。\n  2. **Refinement**: 創建一個清晰、校正後的 Markdown 版本。修正拼寫錯誤、改進標點符號，並根據佈局組織標題/列表。
  3. **Analysis**: 生成一個簡短的摘要（1-2 句話）和 3-5 個相關標籤。
  4. **Confidence**: 根據文字的清晰度，估計一個信心分數（0.0 到 1.0）。
\n  請嚴格以有效的 JSON 格式輸出，不要包含程式碼區塊：\n  {\n    \"rawOcr\": \"...\",\n    \"refinedContent\": \"...\",\n    \"summary\": \"...\",\n    \"tags\": [\"tag1\", \"tag2\"],\n    \"confidence\": 0.95\n  }\n  `;

  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      // 清理 markdown code blocks 和其他可能影響 JSON 解析的字符
      // 移除開頭和結尾的 ```json / ```
      let jsonStr = text.replace(/```json\\n/g, "").replace(/```/g, "").trim();
      // 移除其他非預期控制字符（例如 null 字符等）
      jsonStr = jsonStr.replace(/[\\u0000-\\u001F\\u007F-\\u009F]/g, '');
      
      try {
        return JSON.parse(jsonStr) as ProcessedNote;
      } catch (parseError) {
        console.error("Error parsing Gemini JSON response:", parseError);
        console.error("Raw Gemini text:", text);
        const fallbackRawOcr = text.substring(0, Math.min(200, text.length));
        const fallbackRefinedContent = fallbackRawOcr;
        const fallbackSummary = "AI 內容解析失敗";
        const fallbackTags = ["failed-parse"];
        const fallbackConfidence = 0.1; 
        
        return {
          rawOcr: fallbackRawOcr,
          refinedContent: fallbackRefinedContent,
          summary: fallbackSummary,
          tags: fallbackTags,
          confidence: fallbackConfidence,
        };
      }
    } catch (error) {
      if (error instanceof GoogleGenerativeAIFetchError && error.status === 429) {
        retries++;
        const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000; // Exponential backoff
        console.warn(`Gemini API rate limit hit. Retrying in ${delay / 1000}s... (Attempt ${retries}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Other errors are re-thrown immediately
      }
    }
  }
  throw new Error("Gemini API processing failed after multiple retries due to rate limits.");
}