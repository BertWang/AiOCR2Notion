import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('Received MCP webhook:', payload);

    if (payload && payload.test) {
      return NextResponse.json({ ok: true, test: true });
    }

    // Handle MCP events -> e.g., create note records or trigger processing
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('MCP webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
