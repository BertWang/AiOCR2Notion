import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 使用 Gemini 生成建議
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 解析 JSON，移除可能的 markdown 代碼塊
    let jsonStr = text.replace(/```json\n/g, "").replace(/```/g, "").trim();
    jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

    const suggestions = JSON.parse(jsonStr);

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

    revalidatePath(`/notes/${id}`);

    return NextResponse.json({
      success: true,
      suggestions: formattedSuggestions,
    });
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
