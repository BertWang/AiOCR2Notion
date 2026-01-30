"use client";

import { useState, useEffect } from "react";
import { getVersionInfo, formatVersionInfo } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { Copy, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VersionInfoProps {
  variant?: "compact" | "detailed";
  className?: string;
}

export function VersionInfo({ variant = "compact", className }: VersionInfoProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const versionInfo = getVersionInfo();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = async () => {
    const text = variant === "compact" 
      ? formatVersionInfo(versionInfo)
      : JSON.stringify(versionInfo, null, 2);
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("已複製版本資訊");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("複製失敗");
    }
  };

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-stone-500", className)}>
        <span className="font-mono">{formatVersionInfo(versionInfo)}</span>
        <button
          onClick={handleCopy}
          className="p-1 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors"
          title="複製版本資訊"
        >
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("bg-white border border-stone-200 rounded-xl p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-stone-600" />
          <h3 className="text-lg font-semibold text-stone-800">關於 TestMoltbot</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-8"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1.5 text-green-500" />
              已複製
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1.5" />
              複製資訊
            </>
          )}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-stone-100">
          <span className="text-sm text-stone-600 font-medium">版本</span>
          <span className="text-sm font-mono text-stone-800 bg-stone-50 px-2 py-1 rounded">
            v{versionInfo.version}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-stone-100">
          <span className="text-sm text-stone-600 font-medium">環境</span>
          <span className={cn(
            "text-sm font-mono px-2 py-1 rounded",
            versionInfo.environment === "production"
              ? "bg-green-50 text-green-700"
              : "bg-yellow-50 text-yellow-700"
          )}>
            {versionInfo.environment}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-stone-100">
          <span className="text-sm text-stone-600 font-medium">構建時間</span>
          <span className="text-sm font-mono text-stone-700">
            {mounted ? (
              new Date(versionInfo.buildTime).toLocaleString("zh-TW", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            ) : (
              versionInfo.buildTime
            )}
          </span>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-stone-600 font-medium">Node 版本</span>
          <span className="text-sm font-mono text-stone-700">
            {versionInfo.nodeVersion}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-stone-100">
        <p className="text-xs text-stone-500 leading-relaxed">
          TestMoltbot 是一個智慧手寫筆記數位化系統，使用 Next.js + Gemini AI 構建。
        </p>
      </div>
    </div>
  );
}
