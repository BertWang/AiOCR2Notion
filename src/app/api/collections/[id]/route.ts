import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 檢查是否會造成循環引用
async function willCreateCycle(collectionId: string, newParentId: string): Promise<boolean> {
  let currentId: string | null = newParentId;
  
  // 向上追溯最多 50 層（防止無限迴圈）
  for (let i = 0; i < 50; i++) {
    if (currentId === collectionId) {
      return true; // 發現循環
    }
    
    const parent: { parentId: string | null } | null = await prisma.collection.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    
    if (!parent || !parent.parentId) {
      break; // 到達根節點
    }
    
    currentId = parent.parentId;
  }
  
  return false;
}

// 更新資料夾（包含移動）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, description, parentId, color, icon, order } = await request.json();

    // 驗證資料夾是否存在
    const existing = await prisma.collection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // 如果要移動資料夾，檢查循環引用
    if (parentId !== undefined && parentId !== existing.parentId) {
      if (parentId === id) {
        return NextResponse.json({ error: "Collection cannot be its own parent" }, { status: 400 });
      }

      if (parentId && await willCreateCycle(id, parentId)) {
        return NextResponse.json({ error: "Moving would create a circular reference" }, { status: 400 });
      }

      // 驗證父資料夾存在
      if (parentId) {
        const parent = await prisma.collection.findUnique({
          where: { id: parentId },
        });
        if (!parent) {
          return NextResponse.json({ error: "Parent collection not found" }, { status: 404 });
        }
      }
    }

    // 更新資料夾
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (order !== undefined) updateData.order = order;

    const collection = await prisma.collection.update({
      where: { id },
      data: updateData,
      include: {
        notes: { select: { id: true } },
        children: true,
      }
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Update Collection Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 移動筆記到資料夾
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

    // 驗證資料夾存在
    const collection = await prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
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
