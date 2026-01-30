import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

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

    // 使用 Gemini 生成回應
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    let aiResponse: string;
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      aiResponse = response.text();

      if (!aiResponse?.trim()) {
        return NextResponse.json(
          { error: "Empty response from AI service" },
          { status: 502 }
        );
      }
    } catch (aiError) {
      console.error("Gemini API Error:", aiError);
      const errorMessage = aiError instanceof Error ? aiError.message : "Unknown AI error";
      return NextResponse.json(
        { error: `AI service error: ${errorMessage}` },
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

    revalidatePath(`/notes/${id}`);

    return NextResponse.json({
      success: true,
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to process chat message",
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
