import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from 'next/cache';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params; // 正確解構 await params

    if (!id) {
      return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
    }

    // 1. 查找筆記以獲取圖片路徑
    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // 2. 從資料庫刪除筆記記錄
    await prisma.note.delete({
      where: { id },
    });

    // 3. 刪除對應的圖片檔案
    if (note.fileKey) { // 使用 fileKey 來構建路徑更可靠
      const filePath = path.join(process.cwd(), "public/uploads", note.fileKey);
      try {
        await unlink(filePath);
        console.log(`Deleted image file: ${filePath}`);
      } catch (fileError) {
        console.warn(`Failed to delete image file ${filePath}:`, fileError);
        // 即使檔案刪除失敗，資料庫記錄也應該刪除，所以不影響主流程
      }
    }

    // 重新驗證首頁數據，確保前端列表即時更新
    revalidatePath('/');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete Note Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
