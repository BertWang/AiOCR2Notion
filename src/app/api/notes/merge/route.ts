import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length < 2) {
      return NextResponse.json({ error: "Please select at least 2 notes to merge" }, { status: 400 });
    }

    // 1. Fetch selected notes
    const notesToMerge = await prisma.note.findMany({
      where: {
        id: { in: ids },
      },
      orderBy: {
        createdAt: 'asc', // 按時間順序 (舊到新)
      },
    });

    if (notesToMerge.length === 0) {
        return NextResponse.json({ error: "No notes found" }, { status: 404 });
    }

    // 2. Combine content with embedded images
    let mergedContent = "# Merged Notes Collection\n\n";
    let mergedSummary = "Merged from: ";
    let mergedTagsSet = new Set<string>();
    
    // 使用第一張圖作為封面
    const coverImage = notesToMerge[0].imageUrl;

    notesToMerge.forEach((note, index) => {
        mergedContent += `## Section ${index + 1}: ${note.summary || 'Untitled'}\n\n`;
        
        // 嵌入圖片連結，讓 Markdown 預覽能顯示圖片，實現「多圖多文」串列
        if (note.imageUrl) {
            mergedContent += `![Page ${index + 1}](${note.imageUrl})\n\n`;
        }

        mergedContent += `${note.refinedContent || note.rawOcrText || '(No Content)'}\n\n`;
        mergedContent += `---\n\n`;

        if (note.summary) mergedSummary += `${note.summary.slice(0, 20)}... `;
        if (note.tags) note.tags.split(',').forEach(tag => mergedTagsSet.add(tag.trim()));
    });

    // 3. Create new merged note
    const newNote = await prisma.note.create({
        data: {
            imageUrl: coverImage, // 使用第一張圖作為封面，讓列表頁有圖可看
            fileKey: "merged", // 標記為合併筆記
            status: "COMPLETED",
            refinedContent: mergedContent,
            summary: mergedSummary.slice(0, 200), 
            tags: Array.from(mergedTagsSet).join(','),
            rawOcrText: "(Merged Note Collection)"
        }
    });

    return NextResponse.json({ success: true, note: newNote });

  } catch (error) {
    console.error("Merge API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
