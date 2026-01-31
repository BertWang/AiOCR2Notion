import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { OCRProviderManager } from "@/lib/ocr-provider-manager";
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const { noteId } = await request.json();

    if (!noteId) {
      return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
    }

    // 1. 獲取筆記資訊
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // 2. 更新狀態為 PROCESSING
    await prisma.note.update({
      where: { id: noteId },
      data: { 
          status: "PROCESSING", 
          errorMessage: null 
      },
    });

    // 3. 重新執行 AI 處理 (使用可配置的 AI 提供商)
    // 注意：imageUrl 格式是 "/uploads/filename"，我們需要轉換回系統絕對路徑
    const filename = note.fileKey || path.basename(note.imageUrl);
    const filepath = path.join(process.cwd(), "public/uploads", filename);
    
    // 簡單判斷 mime type (這在正式環境應該存在 DB，這邊先簡單判斷)
    const mimeType = filename.endsWith(".png") ? "image/png" : "image/jpeg";

    try {
      // 優先使用原提供商，其次使用故障轉移
      const aiResult = await OCRProviderManager.processNotePreferOriginal(
        noteId,
        filepath,
        mimeType
      );
      
      // 4. 更新資料庫
      const updatedNote = await prisma.note.update({
        where: { id: noteId },
        data: {
          rawOcrText: aiResult.rawOcr,
          refinedContent: aiResult.refinedContent,
          summary: aiResult.summary,
          tags: aiResult.tags.join(","),
          confidence: aiResult.confidence,
          ocrProvider: aiResult.usedProvider,
          status: "COMPLETED",
        },
      });

      revalidatePath('/');

      return NextResponse.json({ success: true, note: updatedNote });

    } catch (aiError) {
      console.error("Retry AI Error:", aiError);
      await prisma.note.update({
        where: { id: noteId },
        data: { 
            status: "FAILED",
            errorMessage: aiError instanceof Error ? aiError.message : "Retry Failed"
        }
      });
      return NextResponse.json({ error: "Retry failed" }, { status: 500 });
    }

  } catch (error) {
    console.error("Retry Endpoint Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
