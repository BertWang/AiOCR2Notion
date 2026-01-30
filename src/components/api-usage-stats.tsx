"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Zap,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface APIStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  avgExecutionTime: number;
  byProvider: Record<string, any>;
  dailyStats: Record<string, any>;
}

export function APIUsageStats() {
  const [stats, setStats] = useState<APIStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats/api-usage');
      const data = await response.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Load API stats error:", error);
      toast.error("載入統計失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
    </div>;
  }

  if (!stats) {
    return <div className="text-center py-12 text-stone-500">無法載入統計資料</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">API 使用統計</h2>
        <Button size="sm" variant="outline" onClick={loadStats}>
          <RefreshCw className="w-4 h-4 mr-2" />
          重新整理
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-stone-500 mb-2">總請求數</div>
          <div className="text-2xl font-bold">{stats.totalRequests}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-stone-500 mb-2">成功</div>
          <div className="text-2xl font-bold text-green-600">{stats.successfulRequests}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-stone-500 mb-2">失敗</div>
          <div className="text-2xl font-bold text-red-600">{stats.failedRequests}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-stone-500 mb-2">總成本</div>
          <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
        </Card>
      </div>
    </div>
  );
}
