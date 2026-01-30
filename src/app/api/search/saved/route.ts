import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 保存搜尋管理
 * GET: 獲取已保存的搜尋
 * POST: 創建新的保存搜尋
 * PUT: 更新保存的搜尋
 * DELETE: 刪除保存的搜尋
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const savedSearches = await prisma.savedSearch.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(savedSearches);
  } catch (error) {
    console.error("Get saved searches error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, query, filters, description, userId } = await request.json();

    if (!name || !query) {
      return NextResponse.json(
        { error: "Name and query are required" },
        { status: 400 }
      );
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        name,
        query,
        filters: filters ? JSON.stringify(filters) : null,
        description,
        userId: userId || null,
      },
    });

    return NextResponse.json(savedSearch, { status: 201 });
  } catch (error) {
    console.error("Create saved search error:", error);
    return NextResponse.json(
      { error: "Failed to create saved search" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const { name, query, filters, description } = await request.json();

    const updatedSearch = await prisma.savedSearch.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(query && { query }),
        ...(filters && { filters: JSON.stringify(filters) }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(updatedSearch);
  } catch (error) {
    console.error("Update saved search error:", error);
    return NextResponse.json(
      { error: "Failed to update saved search" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    await prisma.savedSearch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete saved search error:", error);
    return NextResponse.json(
      { error: "Failed to delete saved search" },
      { status: 500 }
    );
  }
}
