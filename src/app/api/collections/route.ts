import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 輔助函數：將扁平列表轉換為樹狀結構
interface CollectionWithChildren {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  notes: { id: string }[];
  children?: CollectionWithChildren[];
}

function buildCollectionTree(collections: any[]): CollectionWithChildren[] {
  const map = new Map<string, CollectionWithChildren>();
  const roots: CollectionWithChildren[] = [];

  // 創建 map
  collections.forEach(col => {
    map.set(col.id, { ...col, children: [] });
  });

  // 建立父子關係
  collections.forEach(col => {
    const node = map.get(col.id)!;
    if (col.parentId && map.has(col.parentId)) {
      const parent = map.get(col.parentId)!;
      parent.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  // 遞迴排序
  const sortChildren = (nodes: CollectionWithChildren[]) => {
    nodes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
}

// 獲取所有資料夾（樹狀結構）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'tree'; // 'tree' 或 'flat'

    const collections = await prisma.collection.findMany({
      where: { userId: "default" },
      include: { 
        notes: { select: { id: true } }
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ],
    });

    if (format === 'flat') {
      return NextResponse.json(collections);
    }

    // 返回樹狀結構
    const tree = buildCollectionTree(collections);
    return NextResponse.json({ 
      collections: tree,
      total: collections.length 
    });

  } catch (error) {
    console.error("Get Collections Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 建立新資料夾
export async function POST(request: NextRequest) {
  try {
    const { name, description, parentId, color, icon } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    }

    // 檢查父資料夾是否存在
    if (parentId) {
      const parent = await prisma.collection.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent collection not found" }, { status: 404 });
      }
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        parentId: parentId || null,
        color: color || null,
        icon: icon || null,
        userId: "default",
      },
      include: {
        notes: { select: { id: true } },
        children: true,
      }
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
