import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

// 配置常數
const TIMEOUT_MS = process.env.CHAT_TIMEOUT_MS ? parseInt(process.env.CHAT_TIMEOUT_MS) : 60000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// 計算指數退避延遲
function getRetryDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing note ID" }, { status: 400 });
    }

    // 獲取聊天歷史
    const messages = await prisma.chatMessage.findMany({
      where: { noteId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("Get Chat History Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const { id } = await params;
    const { message } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing note ID" }, { status: 400 });
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // 獲取筆記
    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const noteContent = note.refinedContent || note.rawOcrText || "";

    if (!noteContent) {
      return NextResponse.json(
        { error: "Note has no content to analyze" },
        { status: 400 }
      );
    }

    // 保存用戶訊息
    const userMessage = await prisma.chatMessage.create({
      data: {
        noteId: id,
        role: "user",
        content: message.trim(),
      },
    });

    // 獲取聊天歷史（用於上下文）
    const chatHistory = await prisma.chatMessage.findMany({
      where: { noteId: id },
      orderBy: { createdAt: "asc" },
      take: 10, // 最多取前 10 條訊息
    });

    // 構建對話上下文
    const conversationContext = chatHistory
      .map((msg) => `${msg.role === "user" ? "用戶" : "AI"}: ${msg.content}`)
      .join("\n");

    const prompt = `你是一個智能筆記助手。根據以下筆記內容和用戶的問題，提供有幫助的回答。

**筆記內容**:
${noteContent.substring(0, 2000)}

${conversationContext ? `**對話歷史**:\n${conversationContext}\n\n` : ""}**最新提問**: ${message}

請以簡潔、有用的方式回答。如果問題與筆記內容無關，可以禮貌地說明。`;

    // 使用 Gemini 生成回應（帶重試邏輯）
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    let aiResponse: string | undefined;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
        const model = genAI.getGenerativeModel({ model: modelName });

        // 設定超時
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const result = await model.generateContent(prompt);
          clearTimeout(timeoutId);
          
          const response = await result.response;
          aiResponse = response.text();

          if (!aiResponse?.trim()) {
            throw new Error("Empty response from AI service");
          }

          // 成功獲取回應，跳出重試循環
          break;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      } catch (aiError) {
        lastError = aiError as Error;
        
        // 檢查是否為超時錯誤
        if (lastError.name === "AbortError" || lastError.message.includes("timeout")) {
          console.warn(`Attempt ${attempt + 1}/${MAX_RETRIES}: Request timeout`);
          
          // 最後一次嘗試
          if (attempt === MAX_RETRIES - 1) {
            return NextResponse.json(
              { 
                error: "Request timeout", 
                code: "TIMEOUT",
                details: "AI 服務回應超時，請稍後重試"
              },
              { status: 408 }
            );
          }
          
          // 等待後重試
          const delay = getRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // 檢查速率限制
        if (aiError instanceof GoogleGenerativeAIFetchError && aiError.status === 429) {
          console.warn(`Attempt ${attempt + 1}/${MAX_RETRIES}: Rate limit (429)`);
          
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

          // 指數退避重試
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
      console.error(`AI Chat failed after ${MAX_RETRIES} attempts. Time: ${elapsedTime}ms`, lastError);
      return NextResponse.json(
        { 
          error: "Failed to generate response after multiple retries",
          code: "MAX_RETRIES_EXCEEDED",
          details: lastError?.message || "Unknown error"
        },
        { status: 503 }
      );
    }

    // 保存 AI 回應
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        noteId: id,
        role: "assistant",
        content: aiResponse,
      },
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`AI Chat completed successfully in ${elapsedTime}ms`);

    revalidatePath(`/notes/${id}`);

    return NextResponse.json({
      success: true,
      userMessage,
      assistantMessage,
      metadata: {
        processingTime: elapsedTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error("AI Chat Error:", error, { elapsedTime });
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusCode = 
      error instanceof GoogleGenerativeAIFetchError && error.status === 429 ? 429 : 500;

    return NextResponse.json(
      { 
        error: "Failed to process chat message",
        details: errorMessage,
        code: "CHAT_ERROR",
        timestamp: new Date().toISOString(),
        processingTime: elapsedTime
      },
      { status: statusCode }
    );
  }
}
