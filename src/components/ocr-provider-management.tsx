"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Cloud,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Trash2,
  Save,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";

interface OCRProvider {
  provider: string;
  enabled: boolean;
  priority: number;
  isDefault: boolean;
  apiKey?: string;
  endpoint?: string;
  config?: Record<string, any>;
}

interface Analytics {
  providers: Array<{
    provider: string;
    enabled: boolean;
    priority: number;
    isDefault: boolean;
    avgResponseTimeMs?: number;
    successRate?: number;
    costPerRequest?: number;
    monthlyUsage?: number;
    monthlyQuota?: number;
    status: string;
  }>;
  totalCost: number;
  averageResponseTime: number;
}

const OCR_PROVIDER_NAMES: Record<string, string> = {
  gemini: "Google Gemini",
  azure: "Azure Computer Vision",
  openai: "OpenAI",
  googleVision: "Google Cloud Vision",
  tesseract: "Tesseract (Local)",
  textract: "AWS Textract",
};

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  gemini: "Google 的多模態 AI 模型，支持視覺理解",
  azure: "Microsoft Azure 的企業級 OCR 服務",
  openai: "OpenAI 的視覺 API",
  googleVision: "Google Cloud 的高精度 OCR",
  tesseract: "開源 OCR 引擎，本地部署",
  textract: "AWS 的文檔智能服務",
};

export function OCRProviderManagement() {
  const [providers, setProviders] = useState<OCRProvider[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [showApiKeys, setShowApiKeys] = useState<Set<string>>(new Set());

  // 載入提供商列表
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ocr-providers");
      if (!response.ok) throw new Error("無法載入提供商");

      const data = await response.json();
      setProviders(data.providers);
      setAnalytics(data.analytics);
    } catch (error) {
      toast.error("載入提供商失敗");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/ocr-providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers }),
      });

      if (!response.ok) throw new Error("無法保存配置");

      toast.success("提供商配置已更新");
      await loadProviders();
    } catch (error) {
      toast.error("保存失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleHealthCheck = async (provider: string) => {
    setTesting((prev) => ({ ...prev, [provider]: true }));
    try {
      const response = await fetch("/api/admin/ocr-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) throw new Error("健康檢查失敗");

      const data = await response.json();
      const { healthy, message, responseTimeMs } = data.health;

      if (healthy) {
        toast.success(`${provider} 連接正常 (${responseTimeMs}ms)`);
      } else {
        toast.error(`${provider}: ${message}`);
      }
    } catch (error) {
      toast.error("健康檢查失敗");
    } finally {
      setTesting((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const toggleEnabled = (provider: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.provider === provider ? { ...p, enabled: !p.enabled } : p
      )
    );
  };

  const toggleDefault = (provider: string) => {
    setProviders((prev) =>
      prev.map((p) => ({
        ...p,
        isDefault: p.provider === provider,
      }))
    );
  };

  const changePriority = (provider: string, direction: "up" | "down") => {
    const index = providers.findIndex((p) => p.provider === provider);
    if (index === -1) return;

    const newProviders = [...providers];
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= newProviders.length) return;

    // 交換優先級
    const temp = newProviders[index].priority;
    newProviders[index].priority = newProviders[swapIndex].priority;
    newProviders[swapIndex].priority = temp;

    setProviders(newProviders);
  };

  const updateApiKey = (provider: string, apiKey: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.provider === provider ? { ...p, apiKey } : p
      )
    );
  };

  const updateEndpoint = (provider: string, endpoint: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.provider === provider ? { ...p, endpoint } : p
      )
    );
  };

  const toggleShowApiKey = (provider: string) => {
    setShowApiKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(provider)) {
        newSet.delete(provider);
      } else {
        newSet.add(provider);
      }
      return newSet;
    });
  };

  if (loading) {
    return <div className="p-6 text-center">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 概覽卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">啟用的提供商</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.filter((p) => p.enabled).length}/{providers.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均響應時間</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.averageResponseTime || 0}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">月度成本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(analytics?.totalCost || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 提供商管理 */}
      <Card>
        <CardHeader>
          <CardTitle>OCR 提供商配置</CardTitle>
          <CardDescription>
            管理多個 OCR 提供商，系統將自動故障轉移
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {providers.map((provider, index) => (
              <div
                key={provider.provider}
                className="border border-stone-200 rounded-lg p-4 space-y-4"
              >
                {/* 提供商頭部 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Cloud className="w-5 h-5 text-blue-500" />
                    <div>
                      <h3 className="font-semibold">
                        {OCR_PROVIDER_NAMES[provider.provider] || provider.provider}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {PROVIDER_DESCRIPTIONS[provider.provider]}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {provider.isDefault && (
                      <Badge variant="default">默認</Badge>
                    )}
                    <Badge
                      variant={provider.enabled ? "default" : "secondary"}
                    >
                      {provider.enabled ? "啟用" : "禁用"}
                    </Badge>
                  </div>
                </div>

                {/* 優先級和狀態 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-stone-600">
                      優先級
                    </label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-lg font-bold">
                        {provider.priority}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => changePriority(provider.provider, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() =>
                            changePriority(provider.provider, "down")
                          }
                          disabled={index === providers.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {analytics?.providers[index]?.avgResponseTimeMs && (
                    <div>
                      <label className="text-xs font-medium text-stone-600">
                        平均響應
                      </label>
                      <div className="text-sm font-semibold mt-1">
                        {analytics.providers[index].avgResponseTimeMs}ms
                      </div>
                    </div>
                  )}

                  {analytics?.providers[index]?.successRate && (
                    <div>
                      <label className="text-xs font-medium text-stone-600">
                        成功率
                      </label>
                      <div className="text-sm font-semibold mt-1">
                        {(
                          (analytics.providers[index].successRate || 0) * 100
                        ).toFixed(1)}
                        %
                      </div>
                    </div>
                  )}

                  {analytics?.providers[index]?.costPerRequest && (
                    <div>
                      <label className="text-xs font-medium text-stone-600">
                        單次成本
                      </label>
                      <div className="text-sm font-semibold mt-1">
                        ${(
                          analytics.providers[index].costPerRequest || 0
                        ).toFixed(4)}
                      </div>
                    </div>
                  )}
                </div>

                {/* API 密鑰配置 */}
                {provider.apiKey !== undefined && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API 密鑰</label>
                    <div className="flex gap-2">
                      <Input
                        type={showApiKeys.has(provider.provider) ? "text" : "password"}
                        value={provider.apiKey || ""}
                        onChange={(e) =>
                          updateApiKey(provider.provider, e.target.value)
                        }
                        placeholder="輸入 API 密鑰"
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleShowApiKey(provider.provider)}
                      >
                        {showApiKeys.has(provider.provider) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 端點配置 */}
                {provider.endpoint !== undefined && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API 端點 (可選)</label>
                    <Input
                      value={provider.endpoint || ""}
                      onChange={(e) =>
                        updateEndpoint(provider.provider, e.target.value)
                      }
                      placeholder="https://..."
                    />
                  </div>
                )}

                {/* 操作按鈕 */}
                <div className="flex gap-2 pt-2 border-t border-stone-100">
                  <Button
                    size="sm"
                    variant={provider.enabled ? "default" : "outline"}
                    onClick={() => toggleEnabled(provider.provider)}
                  >
                    {provider.enabled ? "禁用" : "啟用"}
                  </Button>

                  {!provider.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleDefault(provider.provider)}
                    >
                      設為默認
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleHealthCheck(provider.provider)}
                    disabled={testing[provider.provider]}
                  >
                    {testing[provider.provider] ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    )}
                    測試連接
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 保存按鈕 */}
          <div className="flex gap-2 mt-6 pt-4 border-t border-stone-200">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-stone-900 text-white hover:bg-stone-800"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              保存配置
            </Button>

            <Button
              onClick={() => loadProviders()}
              variant="outline"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重新載入
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 性能分析 */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle>性能分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.providers.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">
                      {OCR_PROVIDER_NAMES[p.provider] || p.provider}
                    </h4>
                    <div className="text-xs text-stone-500">
                      {p.enabled ? "✓ 啟用" : "✗ 禁用"} • 優先級: {p.priority}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>
                      響應: {p.avgResponseTimeMs || "-"}ms • 成功率:{" "}
                      {p.successRate
                        ? `${(p.successRate * 100).toFixed(1)}%`
                        : "-"}
                    </div>
                    {p.monthlyUsage && p.monthlyQuota && (
                      <div className="text-xs text-stone-500">
                        用量: {p.monthlyUsage}/{p.monthlyQuota}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
