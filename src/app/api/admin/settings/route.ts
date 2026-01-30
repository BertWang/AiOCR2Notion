import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET current settings (creates default if missing)
export async function GET() {
  try {
    let settings = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      settings = await prisma.adminSettings.create({
        data: {
          id: "singleton",
          aiProvider: "gemini-2.0-flash",
          modelName: "gemini-2.0-flash",
          config: JSON.stringify({}),
        },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Get Admin Settings Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT update settings
export async function PUT(request: NextRequest) {
  try {
    const payload = await request.json();
    const { aiProvider, modelName, config } = payload;

    const updated = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {
        aiProvider: aiProvider ?? undefined,
        modelName: modelName ?? undefined,
        config: typeof config === 'string' ? config : JSON.stringify(config ?? {}),
      },
      create: {
        id: "singleton",
        aiProvider: aiProvider ?? "gemini-2.0-flash",
        modelName: modelName ?? "gemini-2.0-flash",
        config: typeof config === 'string' ? config : JSON.stringify(config ?? {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update Admin Settings Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
