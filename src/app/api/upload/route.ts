import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { AIProviderFactory } from "@/lib/ai-service/factory";
import { OCRProviderManager } from "@/lib/ocr-provider-manager";
import { NotesProcessingPipeline } from "@/lib/processing-pipeline";
import { revalidatePath } from 'next/cache'; // 引入 revalidatePath

// --- 本地速率限制器 (In-Memory) ---
const MAX_REQUESTS_PER_MINUTE = 5; // 每分鐘最多處理 5 個 AI 請求
let requestCount = 0;
let lastResetTime = Date.now();

function checkRateLimit() {
  const now = Date.now();
  // 如果超過一分鐘，重置計數器
  if (now - lastResetTime > 60 * 1000) {
    requestCount = 0;
    lastResetTime = now;
  }

  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    return { limited: true, retryAfter: 60 - Math.floor((now - lastResetTime) / 1000) };
  }

  requestCount++;
  return { limited: false };
}
// -------------------------------------

export async function POST(request: NextRequest) {
  try {
    // --- 應用速率限制 ---
    const rateLimitStatus = checkRateLimit();
    if (rateLimitStatus.limited) {
      return NextResponse.json(
        { 
          error: "AI 服務繁忙，請稍後再試", 
          retryAfter: rateLimitStatus.retryAfter 
        }, 
        { status: 429 }
      );
    }
    // -------------------

    const formData = await request.formData();
    const file = formData.get("file") as File;

    console.log("Received upload request. File:", file?.name, "Type:", file?.type, "Size:", file?.size);

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded or empty file" }, { status: 400 });
    }

    // 1. 儲存檔案到本地 (public/uploads)
    const buffer = Buffer.from(await file.arrayBuffer());
    // 檔名處理：加上時間戳記避免重複，並移除空格
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}-${safeName}`;
    const uploadDir = path.join(process.cwd(), "public/uploads");
    
    // 確保目錄存在
    await mkdir(uploadDir, { recursive: true });
    
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);
    
    const publicUrl = `/uploads/${filename}`;

    // 2. 在資料庫建立 PENDING 記錄
    const note = await prisma.note.create({
      data: {
        imageUrl: publicUrl,
        fileKey: filename,
        status: "PROCESSING", // 立即開始處理
        tags: "", // 初始化為空字串，因為 Schema 中是必填
      },
    });

    // 3. 觸發 AI 處理 (使用 OCR 提供商管理器支持故障轉移)
    try {
      // 使用 OCR 提供商管理器 - 支持多提供商和故障轉移
      const pipeline = new NotesProcessingPipeline();
      const aiStartTime = Date.now();
      const aiResult = await OCRProviderManager.processNoteWithFailover(
        filepath,
        file.type || "image/jpeg"
      );
      const executionTimeMs = Date.now() - aiStartTime;
      
      // 4. 更新資料庫
      const updatedNote = await prisma.note.update({
        where: { id: note.id },
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

      // 記錄 API 使用統計 (可選)
      try {
        // 如果 APIUsageLog 模型存在，取消註解下面的代碼
        // await prisma.aPIUsageLog.create({...});
      } catch (logError) {
        console.warn('API usage log failed:', logError);
      }

      // 重新驗證首頁數據，確保前端列表即時更新
      revalidatePath('/');

      return NextResponse.json({ success: true, noteId: updatedNote.id });

    } catch (aiError) {
      console.error("AI Processing Error:", aiError);
      // 更新為失敗狀態
      await prisma.note.update({
        where: { id: note.id },
        data: { 
            status: "FAILED",
            errorMessage: aiError instanceof Error ? aiError.message : "Unknown AI Error"
        }
      });
      return NextResponse.json({ error: "AI processing failed", noteId: note.id }, { status: 500 });
    }

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
