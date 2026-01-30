import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const list = await prisma.integration.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(list);
  } catch (error) {
    console.error("Get Integrations Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { provider, enabled, config } = await request.json();
    if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });

    const created = await prisma.integration.create({
      data: { provider, enabled: !!enabled, config: config ?? {} },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create Integration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, enabled, config } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updated = await prisma.integration.update({
      where: { id },
      data: { enabled: typeof enabled === 'boolean' ? enabled : undefined, config: config ?? undefined },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update Integration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await prisma.integration.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Integration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
