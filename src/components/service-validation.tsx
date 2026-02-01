"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Network,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface ServiceValidationProps {
  serviceId: string;
  serviceName: string;
}

interface ValidationCheck {
  passed: boolean;
  message: string;
}

interface ValidationResult {
  success: boolean;
  status: "valid" | "invalid" | "partial" | "error";
  checks: {
    configComplete: ValidationCheck;
    endpointAccessible: ValidationCheck;
    credentialsValid: ValidationCheck;
    authenticationWorks: ValidationCheck;
  };
  issues: string[];
  suggestions: string[];
  timestamp: string;
  executionTimeMs: number;
}

export function ServiceValidation({ serviceId, serviceName }: ServiceValidationProps) {
  const [validating, setValidating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const response = await fetch(`/api/mcp/${serviceId}/validate`, {
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "驗證失敗");
      }

      setValidationResult(data.validation);
      setExpanded(true);

      if (data.validation.success) {
        toast.success("✓ 配置驗證成功", {
          description: `所有檢查都已通過 (耗時 ${data.validation.executionTimeMs}ms)`,
        });
      } else {
        toast.error("✗ 配置驗證失敗", {
          description: `發現 ${data.validation.issues.length} 個問題`,
        });
      }
    } catch (error) {
      toast.error("驗證出錯", {
        description: error instanceof Error ? error.message : "請稍後重試",
      });
      console.error("Validation error:", error);
    } finally {
      setValidating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "partial":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "invalid":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-stone-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-100 text-green-800">正常</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800">部分問題</Badge>;
      case "invalid":
        return <Badge className="bg-red-100 text-red-800">失敗</Badge>;
      default:
        return <Badge className="bg-stone-100 text-stone-800">未測試</Badge>;
    }
  };

  const CheckItem = ({
    icon: Icon,
    check,
  }: {
    icon: React.ReactNode;
    check: ValidationCheck;
  }) => (
    <div className="flex items-start gap-3 p-2">
      {check.passed ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <p className={`text-sm font-medium ${check.passed ? "text-stone-800" : "text-red-700"}`}>
          {check.message}
        </p>
      </div>
    </div>
  );

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-stone-600" />
            <div>
              <CardTitle className="text-base">配置驗證</CardTitle>
              <CardDescription className="text-xs">
                檢測服務連接和認證狀態
              </CardDescription>
            </div>
          </div>
          {validationResult && getStatusBadge(validationResult.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 驗證按鈕 */}
        <Button
          onClick={handleValidate}
          disabled={validating}
          className="w-full gap-2"
          variant="outline"
        >
          {validating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              驗證中...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              {validationResult ? "重新驗證" : "開始驗證"}
            </>
          )}
        </Button>

        {/* 驗證結果 */}
        {validationResult && (
          <div className="space-y-3">
            {/* 摘要 */}
            <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(validationResult.status)}
                <div>
                  <p className="text-sm font-medium text-stone-700">
                    {validationResult.status === "valid"
                      ? "所有檢查通過"
                      : validationResult.status === "partial"
                        ? "部分檢查失敗"
                        : "多項檢查失敗"}
                  </p>
                  <p className="text-xs text-stone-500">
                    耗時 {validationResult.executionTimeMs}ms • 最後更新:{" "}
                    {new Date(validationResult.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {/* 展開/收起詳情 */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between p-2 hover:bg-stone-50 rounded transition-colors"
            >
              <span className="text-sm font-medium text-stone-700">
                詳細檢查報告
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {expanded && (
              <div className="space-y-3 bg-stone-50 p-3 rounded-lg">
                {/* 各項檢查 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-600">檢查項目：</p>
                  <CheckItem
                    icon={<Zap />}
                    check={validationResult.checks.configComplete}
                  />
                  <CheckItem
                    icon={<Network />}
                    check={validationResult.checks.endpointAccessible}
                  />
                  <CheckItem
                    icon={<Lock />}
                    check={validationResult.checks.credentialsValid}
                  />
                  <CheckItem
                    icon={<Shield />}
                    check={validationResult.checks.authenticationWorks}
                  />
                </div>

                {/* 問題列表 */}
                {validationResult.issues.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-red-600">
                      ⚠ 發現的問題：
                    </p>
                    {validationResult.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 text-xs text-red-700 bg-red-50 p-2 rounded"
                      >
                        <span className="flex-shrink-0">•</span>
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 建議 */}
                {validationResult.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-blue-600">
                      💡 修復建議：
                    </p>
                    {validationResult.suggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 text-xs text-blue-700 bg-blue-50 p-2 rounded"
                      >
                        <span className="flex-shrink-0">→</span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
