"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  Loader2,
  Zap,
  Download,
  Trash2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface DiagnosticLog {
  id: string;
  timestamp: string;
  serviceName: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  metadata?: Record<string, any>;
  executionTimeMs: number;
}

interface TroubleshootingProps {
  serviceId: string;
  serviceName: string;
}

const COMMON_ISSUES: Record<
  string,
  {
    title: string;
    solutions: string[];
  }
> = {
  "ECONNREFUSED": {
    title: "連接被拒絕",
    solutions: [
      "檢查服務是否正在運行",
      "確認端點 URL 和端口號正確",
      "檢查防火牆設置是否允許連接",
      "驗證 VPN 或代理配置",
    ],
  },
  "ETIMEDOUT": {
    title: "連接超時",
    solutions: [
      "增加超時時間設置",
      "檢查網絡連接穩定性",
      "確認服務性能和負載",
      "查看服務日誌了解原因",
    ],
  },
  "ENOTFOUND": {
    title: "域名解析失敗",
    solutions: [
      "驗證端點 URL 拼寫正確",
      "檢查 DNS 配置",
      "確認網絡連接活躍",
      "嘗試使用 IP 地址替代域名",
    ],
  },
  "401": {
    title: "認證失敗",
    solutions: [
      "確認 API 密鑰有效且未過期",
      "檢查認證令牌的格式",
      "驗證服務帳戶有正確的權限",
      "重新生成認證憑證",
    ],
  },
  "403": {
    title: "權限不足",
    solutions: [
      "升級服務帳戶權限等級",
      "檢查 IP 白名單設置",
      "驗證 API 配額限制",
      "聯絡服務提供商",
    ],
  },
};

const getLevelColor = (level: string) => {
  switch (level) {
    case "error":
      return "text-red-700 bg-red-50 border-red-200";
    case "warning":
      return "text-yellow-700 bg-yellow-50 border-yellow-200";
    case "success":
      return "text-green-700 bg-green-50 border-green-200";
    default:
      return "text-stone-700 bg-stone-50 border-stone-200";
  }
};

const getLevelIcon = (level: string) => {
  switch (level) {
    case "error":
      return "❌";
    case "warning":
      return "⚠️";
    case "success":
      return "✅";
    default:
      return "ℹ️";
  }
};

export function ServiceTroubleshooting({
  serviceId,
  serviceName,
}: TroubleshootingProps) {
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "error" | "warning" | "success">(
    "all"
  );

  useEffect(() => {
    loadLogs();
  }, [serviceId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/mcp/diagnostics/logs?serviceId=${serviceId}&limit=100`
      );
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = () => {
    const logsText = logs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toLocaleString()}] ${log.level.toUpperCase()} - ${log.message}`
      )
      .join("\n");

    const blob = new Blob([logsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${serviceName}-diagnostics-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("日誌已下載");
  };

  const clearLogs = async () => {
    if (confirm("確定要清除所有診斷日誌嗎？")) {
      try {
        // 這裡可以添加清除日誌的 API 端點
        toast.success("日誌已清除");
        setLogs([]);
      } catch (error) {
        toast.error("清除失敗");
      }
    }
  };

  const filteredLogs = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  // 分析常見問題
  const commonProblems: string[] = [];
  logs.forEach((log) => {
    Object.keys(COMMON_ISSUES).forEach((key) => {
      if (
        (log.message?.includes(key) || log.metadata?.error?.includes(key)) &&
        !commonProblems.includes(key)
      ) {
        commonProblems.push(key);
      }
    });
  });

  return (
    <div className="space-y-4">
      {/* 常見問題診斷 */}
      {commonProblems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-orange-900">
              <AlertCircle className="h-5 w-5" />
              發現潛在問題
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {commonProblems.map((problem) => {
              const issue = COMMON_ISSUES[problem];
              return (
                <div key={problem} className="space-y-2">
                  <h4 className="font-medium text-sm text-orange-900">
                    {issue.title}
                  </h4>
                  <ul className="space-y-1">
                    {issue.solutions.map((solution, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-orange-800 flex gap-2"
                      >
                        <span className="flex-shrink-0">→</span>
                        <span>{solution}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 診斷日誌 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">診斷日誌</CardTitle>
              <CardDescription className="text-xs">
                最近 {filteredLogs.length} 條記錄
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={downloadLogs}
                className="gap-1"
              >
                <Download className="h-3 w-3" />
                下載
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadLogs}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "刷新"
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* 日誌篩選 */}
          <div className="flex gap-2">
            {(["all", "error", "warning", "success"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`text-xs px-3 py-1 rounded border transition-colors ${
                  filter === level
                    ? "bg-stone-900 text-white border-stone-900"
                    : "border-stone-200 hover:border-stone-400 text-stone-600"
                }`}
              >
                {level === "all"
                  ? "全部"
                  : level === "error"
                    ? "❌ 錯誤"
                    : level === "warning"
                      ? "⚠️ 警告"
                      : "✅ 成功"}
              </button>
            ))}
          </div>

          {/* 日誌列表 */}
          <ScrollArea className="h-64 border border-stone-200 rounded-lg">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-stone-500 text-sm p-4">
                暫無日誌記錄
              </div>
            ) : (
              <div className="space-y-1 p-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded text-xs border font-mono ${getLevelColor(log.level)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex gap-2">
                          <span>{getLevelIcon(log.level)}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="mt-1">{log.message}</p>
                        {log.executionTimeMs > 0 && (
                          <p className="text-xs opacity-70 mt-1">
                            ⏱️ {log.executionTimeMs}ms
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* 清除按鈕 */}
          {logs.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearLogs}
              className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              清除所有日誌
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
