import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 更新資料夾
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, description } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    }

    const collection = await prisma.collection.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Update Collection Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 添加筆記到資料夾
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { noteIds } = await request.json();

    if (!Array.isArray(noteIds) || noteIds.length === 0) {
      return NextResponse.json({ error: "noteIds array is required" }, { status: 400 });
    }

    // 批量更新筆記的 collectionId
    const result = await prisma.note.updateMany({
      where: { id: { in: noteIds } },
      data: { collectionId: id },
    });

    return NextResponse.json({ 
      success: true, 
      updatedCount: result.count 
    });
  } catch (error) {
    console.error("Add Notes to Collection Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 獲取資料夾中的筆記
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Get Collection Details Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
