"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings,
  Zap,
  Database,
  Network,
  Brain,
  BarChart3,
  Package,
  Search,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APIUsageStats } from "@/components/api-usage-stats";

/**
 * 改进的管理后台面板
 * 基于参考设计，使用 openclaw.ai 分析
 */
export function EnhancedAdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash-exp");
  const [selectedOCR, setSelectedOCR] = useState("gemini");

  // 模型列表（包含最新版本）
  const models = [
    {
      id: "gemini-3.0-pro",
      name: "Gemini 3.0 Pro",
      status: "beta",
      tier: "premium",
      features: ["多模态", "高性能", "长上下文"],
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      status: "stable",
      tier: "standard",
      features: ["快速", "经济", "可靠"],
    },
    {
      id: "gemini-2.0-flash-exp",
      name: "Gemini 2.0 Flash (Exp)",
      status: "experimental",
      tier: "beta",
      features: ["新功能", "前沿", "不稳定"],
    },
  ];

  // OCR 提供商列表
  const ocrProviders = [
    {
      id: "gemini",
      name: "Gemini OCR",
      accuracy: "95%",
      speed: "快",
      cost: "$",
      languages: ["中文", "英文", "日文"],
    },
    {
      id: "mineru",
      name: "MinerU",
      accuracy: "92%",
      speed: "很快",
      cost: "免费",
      languages: ["中文", "英文", "多种"],
    },
    {
      id: "paddle",
      name: "PaddleOCR",
      accuracy: "90%",
      speed: "极快",
      cost: "免费",
      languages: ["中文", "英文"],
    },
  ];

  // MCP 市场项目
  const mcpMarketItems = [
    {
      name: "Notion MCP",
      category: "数据库",
      status: "stable",
      users: "5K+",
      icon: "📊",
    },
    {
      name: "Web Search",
      category: "搜索",
      status: "stable",
      users: "3K+",
      icon: "🔍",
    },
    {
      name: "File System",
      category: "文件",
      status: "stable",
      users: "2K+",
      icon: "📁",
    },
    {
      name: "Database MCP",
      category: "数据库",
      status: "beta",
      users: "1K+",
      icon: "🗄️",
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* 导航 */}
        <div className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-stone-900" />
                <div>
                  <h1 className="text-xl font-bold text-stone-900">
                    智能管理后台
                  </h1>
                  <p className="text-xs text-stone-500">
                    由 openclaw.ai 驱动的智能配置系统
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI 分析
              </Button>
            </div>

            <TabsList className="grid w-full grid-cols-6 bg-stone-100 h-auto p-1">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">概览</span>
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">模型</span>
              </TabsTrigger>
              <TabsTrigger value="ocr" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">OCR</span>
              </TabsTrigger>
              <TabsTrigger value="mcp" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">MCP</span>
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span className="hidden sm:inline">数据库</span>
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">监控</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* 概览 Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 当前模型卡片 */}
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">当前 AI 模型</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900">
                    Gemini 2.0
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    Flash Experimental
                  </p>
                  <Button size="sm" className="w-full mt-3">
                    升级到 3.0
                  </Button>
                </CardContent>
              </Card>

              {/* OCR 提供商卡片 */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">OCR 识别</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900">
                    Gemini
                  </div>
                  <p className="text-xs text-green-600 mt-2">准确率 95%</p>
                  <Button size="sm" className="w-full mt-3" variant="outline">
                    切换提供商
                  </Button>
                </CardContent>
              </Card>

              {/* MCP 服务卡片 */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">MCP 服务</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">4</div>
                  <p className="text-xs text-blue-600 mt-2">已启用</p>
                  <Button size="sm" className="w-full mt-3" variant="outline">
                    浏览市场
                  </Button>
                </CardContent>
              </Card>

              {/* 配置状态卡片 */}
              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">系统状态</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-semibold text-orange-900">
                      正常
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 mt-2">无告警</p>
                  <Button size="sm" className="w-full mt-3" variant="outline">
                    查看日志
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* openclaw.ai 建议 */}
            <Card className="border-2 border-purple-300 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  openclaw.ai 智能建议
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <div className="font-medium text-sm">升级到 Gemini 3.0</div>
                    <p className="text-xs text-stone-600 mt-1">
                      Gemini 3.0 Pro 现在可用，性能提升 30%，推荐升级
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    💡
                  </div>
                  <div>
                    <div className="font-medium text-sm">尝试 MinerU OCR</div>
                    <p className="text-xs text-stone-600 mt-1">
                      MinerU 在中文文档上精度更高 (92%)，且完全免费
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    ⚠
                  </div>
                  <div>
                    <div className="font-medium text-sm">启用 Web Search MCP</div>
                    <p className="text-xs text-stone-600 mt-1">
                      Web 搜索功能将扩展笔记内容丰富度
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 模型配置 Tab */}
          <TabsContent value="models" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI 模型选择与配置</CardTitle>
                <CardDescription>选择最适合的 AI 模型和参数配置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 模型卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {models.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        selectedModel === model.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-stone-200 bg-white hover:border-purple-300"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-sm">{model.name}</h4>
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            model.status === "beta"
                              ? "bg-yellow-100 text-yellow-700"
                              : model.status === "experimental"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-green-100 text-green-700"
                          )}
                        >
                          {model.status === "stable"
                            ? "稳定版"
                            : model.status === "beta"
                            ? "测试版"
                            : "实验版"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {model.features.map((feature) => (
                          <span
                            key={feature}
                            className="text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      {selectedModel === model.id && (
                        <Button className="w-full mt-3" size="sm">
                          已选择
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 参数配置 */}
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-semibold text-sm">模型参数</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Temperature</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        defaultValue="1"
                        className="w-full"
                      />
                      <p className="text-xs text-stone-500 mt-1">
                        更高 = 更创意，更低 = 更稳定
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Top K</label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        defaultValue="40"
                        className="w-full"
                      />
                      <p className="text-xs text-stone-500 mt-1">
                        选择的候选数量
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OCR 配置 Tab */}
          <TabsContent value="ocr" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>OCR 识别配置</CardTitle>
                <CardDescription>选择和配置 OCR 提供商</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ocrProviders.map((provider) => (
                    <div
                      key={provider.id}
                      onClick={() => setSelectedOCR(provider.id)}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        selectedOCR === provider.id
                          ? "border-green-500 bg-green-50"
                          : "border-stone-200 bg-white hover:border-green-300"
                      )}
                    >
                      <h4 className="font-semibold text-sm mb-3">
                        {provider.name}
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-stone-500">准确率: </span>
                          <span className="font-semibold">{provider.accuracy}</span>
                        </div>
                        <div>
                          <span className="text-stone-500">速度: </span>
                          <span className="font-semibold">{provider.speed}</span>
                        </div>
                        <div>
                          <span className="text-stone-500">成本: </span>
                          <span className="font-semibold">{provider.cost}</span>
                        </div>
                        <div>
                          <span className="text-stone-500">语言: </span>
                          <span className="font-semibold">
                            {provider.languages.join(", ")}
                          </span>
                        </div>
                      </div>
                      {selectedOCR === provider.id && (
                        <Button className="w-full mt-3" size="sm">
                          已选择
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 测试工具 */}
                <div className="border-t pt-4">
                  <Button className="w-full gap-2">
                    <Zap className="w-4 h-4" />
                    测试 OCR 配置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP 市场 Tab */}
          <TabsContent value="mcp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  MCP 服务市场
                </CardTitle>
                <CardDescription>
                  浏览和安装可用的 MCP 服务
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="搜索 MCP 服务..."
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  />
                  <Button variant="outline">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mcpMarketItems.map((item) => (
                    <Card key={item.name} className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-2xl mb-2">{item.icon}</div>
                            <h4 className="font-semibold text-sm">
                              {item.name}
                            </h4>
                            <p className="text-xs text-stone-500">
                              {item.category}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "text-xs px-2 py-1 rounded-full font-medium",
                              item.status === "stable"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            )}
                          >
                            {item.status === "stable" ? "稳定" : "测试"}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mb-3">
                          {item.users} 用户使用
                        </p>
                        <Button className="w-full" size="sm">
                          安装
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 数据库配置 Tab */}
          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>数据库和整合</CardTitle>
                <CardDescription>配置 Notion 和其他数据源</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-stone-600">
                  数据库配置将在 Phase 4.5 实现
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 监控 Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <APIUsageStats />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
