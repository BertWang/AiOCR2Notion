import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

// 配置常數
const TIMEOUT_MS = process.env.SUGGESTIONS_TIMEOUT_MS ? parseInt(process.env.SUGGESTIONS_TIMEOUT_MS) : 30000;
const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 1000;

// 計算指數退避延遲
function getRetryDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing note ID" }, { status: 400 });
    }

    // 獲取筆記
    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const content = note.refinedContent || note.rawOcrText || "";

    if (!content) {
      return NextResponse.json(
        { error: "Note has no content to analyze" },
        { status: 400 }
      );
    }

    // 使用 Gemini 生成建議（帶重試邏輯）
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `請根據以下筆記內容，提供 3-5 條有用的改進建議，讓使用者可以更好地組織、理解或利用這些內容。建議應該具體、可行、且與筆記內容高度相關。

筆記內容：
${content.substring(0, 2000)}

請以 JSON 陣列格式輸出，每條建議包含 title、description、category (organization/clarity/completeness/format) 和 priority (high/medium/low) 屬性。

JSON 格式：
[
  {
    "title": "建議標題",
    "description": "詳細描述",
    "category": "category",
    "priority": "high"
  }
]`;

    let aiResponse: string | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // 設定超時
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const result = await model.generateContent(prompt);
          clearTimeout(timeoutId);
          
          const response = await result.response;
          const text = response.text();

          if (!text?.trim()) {
            throw new Error("Empty response from AI service");
          }

          aiResponse = text;
          break;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      } catch (aiError) {
        lastError = aiError as Error;
        
        // 檢查是否為超時錯誤
        if (lastError.name === "AbortError" || lastError.message.includes("timeout")) {
          console.warn(`Suggestions attempt ${attempt + 1}/${MAX_RETRIES}: Request timeout`);
          
          if (attempt === MAX_RETRIES - 1) {
            return NextResponse.json(
              { 
                error: "Request timeout", 
                code: "TIMEOUT",
                details: "建議生成超時，請稍後重試"
              },
              { status: 408 }
            );
          }
          
          const delay = getRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // 檢查速率限制
        if (aiError instanceof GoogleGenerativeAIFetchError && aiError.status === 429) {
          console.warn(`Suggestions attempt ${attempt + 1}/${MAX_RETRIES}: Rate limit (429)`);
          
          if (attempt === MAX_RETRIES - 1) {
            return NextResponse.json(
              { 
                error: "Service rate limit exceeded", 
                code: "RATE_LIMIT",
                details: "AI 服務暫時繁忙，請稍後重試"
              },
              { status: 429 }
            );
          }

          const delay = getRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // 其他錯誤直接拋出
        throw aiError;
      }
    }

    if (!aiResponse) {
      const elapsedTime = Date.now() - startTime;
      console.error(`AI Suggestions failed after ${MAX_RETRIES} attempts. Time: ${elapsedTime}ms`, lastError);
      return NextResponse.json(
        { 
          error: "Failed to generate suggestions after multiple retries",
          code: "MAX_RETRIES_EXCEEDED",
          details: lastError?.message || "Unknown error"
        },
        { status: 503 }
      );
    }

    // 解析 JSON，移除可能的 markdown 代碼塊
    let jsonStr = aiResponse.replace(/```json\n/g, "").replace(/```/g, "").trim();
    jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

    let suggestions;
    try {
      suggestions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Response text:", aiResponse.substring(0, 200));
      
      // 降級處理：生成基本建議
      suggestions = [
        {
          title: "整理筆記結構",
          description: "考慮將筆記內容分類整理，使其更易於查閱",
          category: "organization",
          priority: "medium"
        }
      ];
    }

    // 轉換為前端需要的格式
    const formattedSuggestions = suggestions.map(
      (suggestion: any, index: number) => ({
        id: `suggestion-${index}`,
        title: suggestion.title || "改進建議",
        description: suggestion.description || "",
        category: suggestion.category || "organization",
        priority: suggestion.priority || "medium",
      })
    );

    const elapsedTime = Date.now() - startTime;
    console.log(`AI Suggestions completed successfully in ${elapsedTime}ms`);

    revalidatePath(`/notes/${id}`);

    return NextResponse.json({
      success: true,
      suggestions: formattedSuggestions,
      metadata: {
        processingTime: elapsedTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error("AI Suggestions Error:", error, { elapsedTime });
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusCode = 
      error instanceof GoogleGenerativeAIFetchError && error.status === 429 ? 429 : 500;

    return NextResponse.json(
      { 
        error: "Failed to generate suggestions",
        details: errorMessage,
        code: "SUGGESTIONS_ERROR",
        timestamp: new Date().toISOString(),
        processingTime: elapsedTime
      },
      { status: statusCode }
    );
  }
}
