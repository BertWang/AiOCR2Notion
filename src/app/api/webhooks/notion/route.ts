import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('Received Notion webhook:', payload);

    // Example: if payload contains page content, create a Note placeholder
    if (payload && payload.test) {
      return NextResponse.json({ ok: true, test: true });
    }

    // Production: parse Notion webhook payload and upsert Note(s)
    // Here we do a safe no-op demonstration
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Notion webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
