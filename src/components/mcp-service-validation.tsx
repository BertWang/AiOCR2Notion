"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ValidationResult {
  success: boolean;
  status: "valid" | "invalid" | "partial" | "error";
  checks: Record<
    string,
    { passed: boolean; message: string }
  >;
  issues: string[];
  suggestions: string[];
  timestamp: string;
  executionTimeMs: number;
}

interface MCPServiceValidationProps {
  serviceId: string;
  serviceName: string;
  onValidationComplete?: (result: ValidationResult) => void;
}

export function MCPServiceValidation({
  serviceId,
  serviceName,
  onValidationComplete,
}: MCPServiceValidationProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const runValidation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/mcp/${serviceId}/validate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("驗證失敗");
      }

      const result = await response.json();
      setValidation(result);
      onValidationComplete?.(result);

      if (result.status === "valid") {
        toast.success("✓ 驗證通過");
      } else if (result.status === "partial") {
        toast.warning("⚠ 配置不完整");
      } else {
        toast.error("✗ 驗證失敗");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "驗證失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!validation) return null;
    switch (validation.status) {
      case "valid":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "invalid":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "partial":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    if (!validation) return "border-stone-200";
    switch (validation.status) {
      case "valid":
        return "border-green-200 bg-green-50";
      case "invalid":
        return "border-red-200 bg-red-50";
      case "partial":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-stone-200";
    }
  };

  return (
    <Card className={`transition-all ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-sm font-medium">
                {serviceName} - 配置驗證
              </CardTitle>
              {validation && (
                <CardDescription className="text-xs">
                  驗證於 {new Date(validation.timestamp).toLocaleString()}
                  （耗時 {validation.executionTimeMs}ms）
                </CardDescription>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={isLoading}
            onClick={() => (validation ? setIsExpanded(!isExpanded) : null)}
            className="h-8 w-8 p-0"
          >
            {validation ? (
              isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )
            ) : null}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && validation && (
        <CardContent className="space-y-4 text-xs">
          {/* 驗證項目 */}
          <div className="space-y-2 border-t pt-4">
            <h4 className="font-semibold text-stone-700">驗證項目</h4>
            {Object.entries(validation.checks).map(([key, check]) => (
              <div key={key} className="flex items-start gap-2">
                {check.passed ? (
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-stone-800">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="text-stone-600">{check.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 問題 */}
          {validation.issues.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="font-semibold text-red-700">檢測到的問題</h4>
              <ul className="space-y-1">
                {validation.issues.map((issue, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-red-600 flex-shrink-0">•</span>
                    <span className="text-stone-700">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 建議 */}
          {validation.suggestions.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="font-semibold text-blue-700">改進建議</h4>
              <ul className="space-y-1">
                {validation.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-blue-600 flex-shrink-0">→</span>
                    <span className="text-stone-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="border-t pt-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={runValidation}
              disabled={isLoading}
              className="text-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  驗證中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  重新驗證
                </>
              )}
            </Button>
          </div>
        </CardContent>
      )}

      {!validation && (
        <CardContent className="pb-3">
          <Button
            size="sm"
            onClick={runValidation}
            disabled={isLoading}
            className="w-full text-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                驗證中...
              </>
            ) : (
              "開始驗證"
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
