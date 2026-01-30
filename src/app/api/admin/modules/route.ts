/**
 * 模組管理 API
 * 允許註冊、卸載和執行模組
 */

import { NextRequest, NextResponse } from "next/server";
import { ModuleSystem, TextCleanupModule, TaggingModule } from "@/lib/module-system";

// 全局模組系統實例
let moduleSystem: ModuleSystem | null = null;

function getModuleSystem(): ModuleSystem {
  if (!moduleSystem) {
    moduleSystem = new ModuleSystem();
    // 註冊內置模組
    moduleSystem
      .registerModule(new TextCleanupModule(), {})
      .catch(console.error);
    moduleSystem
      .registerModule(new TaggingModule(), {})
      .catch(console.error);
  }
  return moduleSystem;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    const system = getModuleSystem();

    if (action === "list") {
      const modules = system.listModules().map(m => ({
        name: m.name,
        version: m.version,
        type: m.type,
      }));

      return NextResponse.json({ success: true, modules });
    }

    if (action === "getByType") {
      const type = searchParams.get("type");
      if (!type) {
        return NextResponse.json(
          { error: "type parameter required" },
          { status: 400 }
        );
      }

      const modules = system.getModulesByType(type).map(m => ({
        name: m.name,
        version: m.version,
        type: m.type,
      }));

      return NextResponse.json({ success: true, modules });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in module API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, moduleName, input } = body;

    const system = getModuleSystem();

    if (action === "execute") {
      if (!moduleName) {
        return NextResponse.json(
          { error: "moduleName required" },
          { status: 400 }
        );
      }

      const result = await system.executeModule(moduleName, input);

      return NextResponse.json({
        success: true,
        moduleName,
        result,
      });
    }

    if (action === "register") {
      // 這個端點可以用於註冊自定義模組
      // 實現需要支持動態加載代碼，出於安全考慮這裡先不實現
      return NextResponse.json(
        { error: "Custom module registration not yet implemented" },
        { status: 501 }
      );
    }

    if (action === "unload") {
      if (!moduleName) {
        return NextResponse.json(
          { error: "moduleName required" },
          { status: 400 }
        );
      }

      system.unloadModule(moduleName);

      return NextResponse.json({
        success: true,
        message: `Module ${moduleName} unloaded`,
      });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in module API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
