import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 獲取所有資料夾
export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      where: { userId: "default" }, // 目前使用 default user
      include: { 
        notes: { select: { id: true } } // 包含筆記計數
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Get Collections Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 建立新資料夾
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: "default",
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error("Create Collection Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 刪除資料夾
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Collection ID is required" }, { status: 400 });
    }

    // 先移除該資料夾中所有筆記的關聯
    await prisma.note.updateMany({
      where: { collectionId: id },
      data: { collectionId: null },
    });

    // 然後刪除資料夾
    await prisma.collection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Collection Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
