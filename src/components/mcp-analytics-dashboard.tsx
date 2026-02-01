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
  BarChart3,
  TrendingUp,
  DollarSign,
  Zap,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ProviderMetrics {
  provider: string;
  avgResponseTimeMs: number;
  successRate: number;
  costPerRequest: number;
  monthlyUsage: number;
}

interface AnalyticsData {
  averageResponseTime: number;
  totalCost: number;
  successRate: number;
  providers: ProviderMetrics[];
  monthlyUsage: number;
  timestamp: string;
}

export function MCPAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/mcp/operations/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      toast.error("無法加載分析數據");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    // 每 5 分鐘自動刷新
    const interval = setInterval(loadAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            分析儀表板
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            分析儀表板
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-stone-500 py-8">暫無數據</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 頂部摘要卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 平均響應時間 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2 text-stone-600">
              <Zap className="w-4 h-4" />
              平均響應時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-900">
              {analytics.averageResponseTime.toFixed(0)}
              <span className="text-xs text-stone-500 ml-1">ms</span>
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {analytics.averageResponseTime > 1000 ? "⚠ 較慢" : "✓ 正常"}
            </p>
          </CardContent>
        </Card>

        {/* 成功率 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2 text-stone-600">
              <TrendingUp className="w-4 h-4" />
              成功率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {(analytics.successRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {analytics.successRate > 0.95 ? "✓ 優秀" : "⚠ 需改進"}
            </p>
          </CardContent>
        </Card>

        {/* 月度總成本 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2 text-stone-600">
              <DollarSign className="w-4 h-4" />
              月度總成本
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-900">
              ${analytics.totalCost.toFixed(2)}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {analytics.monthlyUsage} 次調用
            </p>
          </CardContent>
        </Card>

        {/* 月度使用次數 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2 text-stone-600">
              <BarChart3 className="w-4 h-4" />
              使用次數
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-900">
              {analytics.monthlyUsage.toLocaleString()}
            </p>
            <p className="text-xs text-stone-500 mt-1">本月統計</p>
          </CardContent>
        </Card>
      </div>

      {/* 提供商性能對比 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>OCR 提供商性能對比</CardTitle>
              <CardDescription>
                比較不同提供商的性能、成本和可靠性
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadAnalytics}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {analytics.providers.map((provider) => (
              <div
                key={provider.provider}
                className="bg-stone-50 rounded-lg p-4 border border-stone-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-stone-900">
                    {provider.provider}
                  </h3>
                  <Badge
                    variant={
                      provider.successRate > 0.95
                        ? "default"
                        : "secondary"
                    }
                  >
                    {(provider.successRate * 100).toFixed(1)}% 成功率
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* 響應時間 */}
                  <div>
                    <p className="text-xs text-stone-600 font-medium">
                      平均響應
                    </p>
                    <p className="text-lg font-bold text-stone-900">
                      {provider.avgResponseTimeMs.toFixed(0)}
                      <span className="text-xs text-stone-500">ms</span>
                    </p>
                  </div>

                  {/* 成功率 */}
                  <div>
                    <p className="text-xs text-stone-600 font-medium">
                      成功率
                    </p>
                    <div className="relative pt-2">
                      <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{
                            width: `${provider.successRate * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-stone-600 mt-1">
                        {(provider.successRate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* 單次成本 */}
                  <div>
                    <p className="text-xs text-stone-600 font-medium">
                      單次成本
                    </p>
                    <p className="text-lg font-bold text-stone-900">
                      $
                      {provider.costPerRequest > 0
                        ? provider.costPerRequest.toFixed(4)
                        : "免費"}
                    </p>
                  </div>

                  {/* 月度使用 */}
                  <div>
                    <p className="text-xs text-stone-600 font-medium">
                      月度使用
                    </p>
                    <p className="text-lg font-bold text-stone-900">
                      {provider.monthlyUsage.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 最優化建議 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">優化建議</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {analytics.averageResponseTime > 1000 && (
              <li className="flex gap-2">
                <span className="text-orange-500 flex-shrink-0">⚠</span>
                <span>
                  平均響應時間較長，考慮使用更快的 OCR 提供商或優化配置
                </span>
              </li>
            )}
            {analytics.successRate < 0.95 && (
              <li className="flex gap-2">
                <span className="text-red-500 flex-shrink-0">✗</span>
                <span>
                  成功率低於 95%，建議檢查服務配置和網絡連接
                </span>
              </li>
            )}
            {analytics.totalCost > 50 && (
              <li className="flex gap-2">
                <span className="text-blue-500 flex-shrink-0">💡</span>
                <span>
                  月度成本較高，可考慮使用免費或低成本的提供商
                </span>
              </li>
            )}
            {analytics.successRate >= 0.95 && analytics.averageResponseTime <= 1000 && (
              <li className="flex gap-2">
                <span className="text-green-500 flex-shrink-0">✓</span>
                <span>系統運行優化，保持現有配置</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
