"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Zap,
  Loader2,
  ChevronDown,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface BackupService {
  id: string;
  name: string;
  priority: number;
  status: string;
  successRate: number;
}

interface FailoverHistory {
  timestamp: string;
  action: string;
  status: string;
  details: string;
}

interface FailoverConfig {
  currentService: {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    status: string;
    lastTestedAt: string;
  };
  backupServices: BackupService[];
  failoverHistory: FailoverHistory[];
}

interface MCPFailoverProps {
  serviceId: string;
  serviceName: string;
  onFailoverComplete?: () => void;
}

export function MCPFailover({
  serviceId,
  serviceName,
  onFailoverComplete,
}: MCPFailoverProps) {
  const [config, setConfig] = useState<FailoverConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFailovering, setIsFailovering] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadFailoverConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/mcp/failover?serviceId=${serviceId}`);
      if (!response.ok) {
        throw new Error("Failed to load failover config");
      }

      const data = await response.json();
      if (data.success) {
        setConfig(data);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加載故障轉移配置失敗");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFailoverConfig();
  }, [serviceId]);

  const triggerFailover = async () => {
    setIsFailovering(true);
    try {
      const response = await fetch("/api/mcp/failover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          reason: "Manual failover triggered by user",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "故障轉移失敗");
      }

      toast.success(`✓ 成功轉移到 ${data.targetService.name}`);
      onFailoverComplete?.();
      loadFailoverConfig();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "故障轉移失敗");
    } finally {
      setIsFailovering(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            故障轉移
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return null;
  }

  const hasBackups = config.backupServices.length > 0;

  return (
    <Card className={`transition-all ${!hasBackups ? "border-red-200 bg-red-50" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasBackups ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <div>
              <CardTitle className="text-sm font-medium">
                {serviceName} - 故障轉移
              </CardTitle>
              <CardDescription className="text-xs">
                {hasBackups
                  ? `${config.backupServices.length} 個備用服務可用`
                  : "⚠ 無備用服務"}
              </CardDescription>
            </div>
          </div>
          {config.backupServices.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </Button>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 text-xs">
          {/* 當前服務狀態 */}
          <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
            <h4 className="font-semibold text-stone-800 mb-2">當前服務</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-600">名稱</span>
                <span className="font-medium">{config.currentService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">狀態</span>
                <Badge
                  variant={
                    config.currentService.status === "success"
                      ? "default"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {config.currentService.status || "未測試"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">最後測試</span>
                <span>
                  {config.currentService.lastTestedAt
                    ? new Date(config.currentService.lastTestedAt).toLocaleString()
                    : "未測試"}
                </span>
              </div>
            </div>
          </div>

          {/* 備用服務列表 */}
          {hasBackups && (
            <div className="space-y-2">
              <h4 className="font-semibold text-stone-800">備用服務</h4>
              {config.backupServices.map((backup, idx) => (
                <div
                  key={backup.id}
                  className="bg-blue-50 rounded-lg p-2 border border-blue-200 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium text-stone-900">
                      {idx + 1}. {backup.name}
                    </div>
                    <div className="text-stone-600">
                      優先級: {backup.priority} | 成功率:{" "}
                      {(backup.successRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  {idx === 0 && (
                    <Badge variant="default" className="text-xs">
                      首選
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 轉移歷史 */}
          {config.failoverHistory.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <h4 className="font-semibold text-stone-800">轉移歷史</h4>
              {config.failoverHistory.slice(0, 5).map((event, idx) => (
                <div key={idx} className="text-xs text-stone-600 flex gap-2">
                  {event.status === "success" ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p>
                      {new Date(event.timestamp).toLocaleString()} -{" "}
                      {event.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="border-t pt-3 flex gap-2">
            {hasBackups && (
              <Button
                size="sm"
                onClick={triggerFailover}
                disabled={isFailovering}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs"
              >
                {isFailovering ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    轉移中...
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-1" />
                    立即轉移
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={loadFailoverConfig}
              disabled={isLoading}
              className="text-xs"
            >
              刷新
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
