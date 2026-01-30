"use client";

import { VersionInfo } from "@/components/version-info";
import { VersionInfoErrorBoundary } from "@/components/version-info-error-boundary";
import { Github, FileText } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50/50 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* 版本資訊 (含錯誤邊界) */}
          <VersionInfoErrorBoundary>
            <VersionInfo variant="compact" />
          </VersionInfoErrorBoundary>

          {/* 連結 */}
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/BertWang/TestMoltbot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GitHub</span>
            </Link>

            <Link
              href="/settings"
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">文件</span>
            </Link>
          </div>

          {/* 版權 */}
          <div className="text-xs text-stone-400 hidden lg:block">
            © 2026 TestMoltbot
          </div>
        </div>
      </div>
    </footer>
  );
}
