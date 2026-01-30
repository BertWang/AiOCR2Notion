"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Settings,
  Zap,
  Network,
  BookOpen,
  Sparkles,
  TrendingUp,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOpenClawAnalysis } from "@/hooks/use-openclaw-analysis";

interface AdminSettings {
  aiProvider: string;
  modelName: string;
  config?: Record<string, any>;
}

interface Integration {
  id: string;
  provider: string;
  enabled: boolean;
  config: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export function SettingsWizard() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    provider: "",
    enabled: true,
    config: {} as Record<string, string>,
  });

  // 使用 openclaw.ai 分析
  const { analysis, loading: analysisLoading } = useOpenClawAnalysis({
    aiProvider: settings?.aiProvider,
    modelName: settings?.modelName,
    integrationsCount: integrations.length,
    enabledIntegrationsCount: integrations.filter((i) => i.enabled).length,
  });

  useEffect(() => {
    fetchSettings();
    fetchIntegrations();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error("Failed to fetch settings:", e);
      toast.error("無法載入設定");
    }
  }

  async function fetchIntegrations() {
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      setIntegrations(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e) {
      console.error("Failed to fetch integrations:", e);
      toast.error("無法載入整合");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    try {
      setSaving(true);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setSettings(data);
      toast.success("設定已保存");
    } catch (e) {
      console.error(e);
      toast.error("保存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function toggleIntegration(id: string, enabled: boolean) {
    try {
      const res = await fetch("/api/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      if (!res.ok) throw new Error("update failed");
      const updated = await res.json();
      setIntegrations((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
      toast.success("整合已更新");
    } catch (e) {
      console.error(e);
      toast.error("更新失敗");
    }
  }

  async function deleteIntegration(id: string) {
    try {
      const res = await fetch(`/api/integrations?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      toast.success("整合已刪除");
    } catch (e) {
      console.error(e);
      toast.error("刪除失敗");
    }
  }

  async function addIntegration() {
    if (!newIntegration.provider.trim()) {
      toast.error("請填寫服務提供商");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIntegration),
      });
      if (!res.ok) throw new Error("add failed");
      const created = await res.json();
      setIntegrations((prev) => [...prev, created]);
      toast.success("整合已新增");
      setShowAddDialog(false);
      setNewIntegration({
        provider: "",
        enabled: true,
        config: {},
      });
    } catch (e) {
      console.error(e);
      toast.error("新增失敗");
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  const aiModels = [
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Experimental)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ];

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          智能設定中心
        </h1>
        <p className="text-stone-600">
          管理 AI 模型、整合服務和系統配置
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">概覽</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">AI 設定</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            <span className="hidden sm:inline">整合</span>
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">幫助</span>
          </TabsTrigger>
        </TabsList>

        {/* 概覽 Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>系統狀態</CardTitle>
              <CardDescription>您的 TestMoltbot 配置概覽</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AI Provider 卡片 */}
                <Card className="bg-stone-50 border-stone-200">
                  <CardContent className="pt-6">
                    <div className="text-sm text-stone-600 mb-1">AI 提供商</div>
                    <div className="text-2xl font-bold text-stone-900">
                      {settings?.aiProvider || "未配置"}
                    </div>
                    <div className="text-xs text-stone-500 mt-2">
                      模型: {settings?.modelName || "未指定"}
                    </div>
                  </CardContent>
                </Card>

                {/* 整合服務計數 */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="text-sm text-blue-600 mb-1">已啟用整合</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {integrations.filter((i) => i.enabled).length}
                    </div>
                    <div className="text-xs text-blue-500 mt-2">
                      共 {integrations.length} 個整合服務
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 快速操作 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-stone-900">快速操作</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setActiveTab("ai")}
                    className="gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    配置 AI
                  </Button>
                  <Button
                    onClick={() => setActiveTab("integrations")}
                    variant="outline"
                    className="gap-2"
                  >
                    <Network className="w-4 h-4" />
                    管理整合
                  </Button>
                  <Button
                    onClick={() => setShowAIAssistant(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    AI 助手
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI 設定 Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI 模型配置</CardTitle>
              <CardDescription>選擇 AI 提供商和模型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">AI 提供商</label>
                <Input
                  value={settings?.aiProvider || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings!,
                      aiProvider: e.target.value,
                    })
                  }
                  placeholder="例如: gemini, openai"
                  className="bg-stone-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">選擇模型</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {aiModels.map((model) => (
                    <button
                      key={model.value}
                      onClick={() =>
                        setSettings({
                          ...settings!,
                          modelName: model.value,
                        })
                      }
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-left",
                        settings?.modelName === model.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      )}
                    >
                      <div className="font-medium text-sm">{model.label}</div>
                      <div className="text-xs text-stone-500">{model.value}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <div className="font-medium">提示</div>
                  <p className="mt-1">
                    Gemini 2.0 Flash (Experimental)
                    提供最新功能和性能。生產環境建議使用穩定版本。
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    "保存配置"
                  )}
                </Button>
                <Button variant="outline" onClick={fetchSettings}>
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 整合 Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>整合服務管理</CardTitle>
              <CardDescription>
                連接第三方服務和 MCP 伺服器
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrations.length === 0 ? (
                <div className="text-center py-8 text-stone-500">
                  <p>還未配置任何整合服務</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {integrations.map((integration) => (
                    <Card key={integration.id} className="bg-stone-50">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-stone-900">
                                {integration.provider}
                              </h4>
                              <span
                                className={cn(
                                  "text-xs px-2 py-1 rounded-full",
                                  integration.enabled
                                    ? "bg-green-100 text-green-700"
                                    : "bg-stone-200 text-stone-600"
                                )}
                              >
                                {integration.enabled ? "已啟用" : "已禁用"}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600">
                              ID: {integration.id.substring(0, 8)}...
                            </p>
                            {integration.config?.endpoint && (
                              <p className="text-xs text-stone-600 mt-1">
                                端點: {integration.config.endpoint}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                toggleIntegration(
                                  integration.id,
                                  !integration.enabled
                                )
                              }
                            >
                              {integration.enabled ? "禁用" : "啟用"}
                            </Button>
                            <AlertDialog>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  // 打開刪除對話框
                                  const event = new CustomEvent(
                                    "openDeleteDialog",
                                    { detail: integration.id }
                                  );
                                  window.dispatchEvent(event);
                                }}
                              >
                                刪除
                              </Button>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Button 
                className="w-full gap-2" 
                variant="outline"
                onClick={() => setShowAddDialog(true)}
              >
                <ChevronRight className="w-4 h-4" />
                新增整合服務
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 幫助 Tab */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>快速指南</CardTitle>
              <CardDescription>了解如何配置 TestMoltbot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <h4 className="font-semibold text-stone-900 mb-1">
                    🤖 配置 AI 模型
                  </h4>
                  <p className="text-sm text-stone-600">
                    前往 AI 設定標籤頁選擇您想要使用的 Gemini 模型。推薦使用最新版本以獲得最佳性能。
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4 py-2">
                  <h4 className="font-semibold text-stone-900 mb-1">
                    🔗 連接整合服務
                  </h4>
                  <p className="text-sm text-stone-600">
                    在整合標籤頁中，您可以添加 MCP
                    伺服器、Notion 等第三方服務。
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <h4 className="font-semibold text-stone-900 mb-1">
                    💡 使用 AI 助手
                  </h4>
                  <p className="text-sm text-stone-600">
                    點擊「AI 助手」按鈕，讓 openclaw.ai 幫助您配置最佳設置。
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <div className="font-medium">需要幫助？</div>
                  <p className="mt-1">
                    如有任何問題或建議，請查看我們的文檔或聯絡支持團隊。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI 助手提示 */}
      {showAIAssistant && (
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <div>
                  <CardTitle>openclaw.ai 智能分析</CardTitle>
                  <CardDescription>
                    AI 正在分析您的系統配置並提供優化建議
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIAssistant(false)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {analysisLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mr-2" />
                <span className="text-sm text-stone-600">分析中...</span>
              </div>
            ) : analysis ? (
              <>
                {/* 問題和警告 */}
                {analysis.issues.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      需要注意的項目
                    </h4>
                    {analysis.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-lg border-l-4",
                          issue.severity === "error"
                            ? "border-red-500 bg-red-50 text-red-900"
                            : issue.severity === "warning"
                            ? "border-yellow-500 bg-yellow-50 text-yellow-900"
                            : "border-blue-500 bg-blue-50 text-blue-900"
                        )}
                      >
                        <div className="font-medium text-sm">{issue.message}</div>
                        <div className="text-xs mt-1 opacity-75">
                          💡 {issue.suggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 推薦項目 */}
                {analysis.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      推薦項目
                    </h4>
                    <div className="space-y-1">
                      {analysis.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="text-sm text-stone-700 flex items-start gap-2"
                        >
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 優化建議 */}
                {analysis.optimizations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      性能優化建議
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {analysis.optimizations.map((opt, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white border border-stone-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-stone-500 uppercase">
                                {opt.category}
                              </div>
                              <div className="text-sm text-stone-900 mt-1">
                                {opt.recommended}
                              </div>
                            </div>
                            <div className="text-xs text-stone-500 whitespace-nowrap">
                              當前: {opt.current}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => setActiveTab("ai")}
                  >
                    <Zap className="w-4 h-4" />
                    應用建議
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAIAssistant(false)}
                  >
                    關閉
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Add Integration Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>新增整合服務</AlertDialogTitle>
            <AlertDialogDescription>
              連接第三方服務或 MCP 伺服器到您的筆記系統
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Provider Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">
                服務提供商 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="例如: Notion, Slack, OpenClaw"
                value={newIntegration.provider}
                onChange={(e) =>
                  setNewIntegration({
                    ...newIntegration,
                    provider: e.target.value,
                  })
                }
                className="w-full"
              />
            </div>

            {/* Config Fields */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">
                配置參數 (可選)
              </label>
              <div className="space-y-2">
                <Input
                  placeholder="端點 URL (例如: https://api.example.com)"
                  value={newIntegration.config.endpoint || ""}
                  onChange={(e) =>
                    setNewIntegration({
                      ...newIntegration,
                      config: {
                        ...newIntegration.config,
                        endpoint: e.target.value,
                      },
                    })
                  }
                  className="w-full"
                />
                <Input
                  type="password"
                  placeholder="API 金鑰 (可選)"
                  value={newIntegration.config.apiKey || ""}
                  onChange={(e) =>
                    setNewIntegration({
                      ...newIntegration,
                      config: {
                        ...newIntegration.config,
                        apiKey: e.target.value,
                      },
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
              <span className="text-sm font-medium text-stone-700">
                立即啟用
              </span>
              <input
                type="checkbox"
                checked={newIntegration.enabled}
                onChange={(e) =>
                  setNewIntegration({
                    ...newIntegration,
                    enabled: e.target.checked,
                  })
                }
                className="w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={saving}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={addIntegration}
              disabled={saving || !newIntegration.provider.trim()}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  處理中...
                </>
              ) : (
                <>新增服務</>
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
