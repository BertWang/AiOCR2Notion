"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, TrendingUp, Users, Star, Info } from "lucide-react";
import { toast } from "sonner";

interface RecommendationScore {
  serviceId: string;
  serviceName: string;
  displayName: string;
  score: number;
  breakdown: {
    popularityScore: number;
    ratingScore: number;
    userRatingScore: number;
    favoriteScore: number;
    successRateScore: number;
  };
  userRelevance: string;
  rank: number;
}

interface MCPRecommendationsProps {
  onServiceSelect?: (serviceId: string) => void;
  excludeInstalled?: boolean;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-700 bg-green-50";
  if (score >= 60) return "text-blue-700 bg-blue-50";
  if (score >= 40) return "text-yellow-700 bg-yellow-50";
  return "text-stone-700 bg-stone-50";
};

const getRelevanceIcon = (relevance: string) => {
  switch (relevance) {
    case "你已收藏此服務":
      return "❤️";
    case "根據你的評分":
      return "⭐";
    case "連接穩定性高":
      return "✅";
    case "熱門服務":
      return "🔥";
    case "用戶評分高":
      return "👍";
    default:
      return "✨";
  }
};

export function MCPRecommendations({
  onServiceSelect,
  excludeInstalled = true,
}: MCPRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [personalized, setPersonalized] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "6",
        userId: "default",
        excludeInstalled: excludeInstalled.toString(),
      });

      const response = await fetch(`/api/mcp/recommendations?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations || []);
        setPersonalized(false);
      } else {
        toast.error("無法加載推薦");
      }
    } catch (error) {
      console.error("Failed to load recommendations:", error);
      toast.error("加載推薦失敗");
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalizedRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mcp/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "default",
          category: null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations || []);
        setPersonalized(true);
      } else {
        toast.error("無法加載個性化推薦");
      }
    } catch (error) {
      console.error("Failed to load personalized recommendations:", error);
      toast.error("加載推薦失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 推薦頭部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-stone-900">
            {personalized ? "為你推薦" : "熱門推薦"}
          </h3>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={!personalized ? "default" : "outline"}
            onClick={loadRecommendations}
            disabled={loading}
          >
            {loading && !personalized && (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            )}
            熱門
          </Button>
          <Button
            size="sm"
            variant={personalized ? "default" : "outline"}
            onClick={loadPersonalizedRecommendations}
            disabled={loading}
          >
            {loading && personalized && (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            )}
            個性化
          </Button>
        </div>
      </div>

      {/* 推薦列表 */}
      {loading && recommendations.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      ) : recommendations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-stone-500">暫無推薦服務</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recommendations.map((rec) => (
            <Card
              key={rec.serviceId}
              className={`cursor-pointer transition-all hover:shadow-md ${
                expandedService === rec.serviceId
                  ? "ring-2 ring-stone-400"
                  : ""
              }`}
              onClick={() =>
                setExpandedService(
                  expandedService === rec.serviceId ? null : rec.serviceId
                )
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-sm">
                        {rec.displayName}
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        #{rec.rank}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs flex items-center gap-1">
                      <span>{getRelevanceIcon(rec.userRelevance)}</span>
                      {rec.userRelevance}
                    </CardDescription>
                  </div>
                  <div
                    className={`px-3 py-1 rounded text-sm font-bold ${getScoreColor(rec.score)}`}
                  >
                    {rec.score.toFixed(1)}
                  </div>
                </div>
              </CardHeader>

              {expandedService === rec.serviceId && (
                <CardContent className="space-y-3 text-xs">
                  {/* 分數詳情 */}
                  <div className="space-y-1.5 bg-stone-50 p-2 rounded">
                    <p className="font-semibold text-stone-700 mb-2">評分詳情：</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">流行度</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{
                                width: `${(rec.breakdown.popularityScore / 20) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right">
                            {rec.breakdown.popularityScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">服務評分</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{
                                width: `${(rec.breakdown.ratingScore / 25) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right">
                            {rec.breakdown.ratingScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">你的評分</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500"
                              style={{
                                width: `${(rec.breakdown.userRatingScore / 20) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right">
                            {rec.breakdown.userRatingScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">成功率</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500"
                              style={{
                                width: `${(rec.breakdown.successRateScore / 20) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right">
                            {rec.breakdown.successRateScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        onServiceSelect?.(rec.serviceId);
                        toast.success(`已選擇 ${rec.displayName}`);
                      }}
                    >
                      查看詳情
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        setExpandedService(
                          expandedService === rec.serviceId ? null : rec.serviceId
                        )
                      }
                    >
                      收起
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 重新加載按鈕 */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() =>
          personalized ? loadPersonalizedRecommendations() : loadRecommendations()
        }
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        刷新推薦
      </Button>
    </div>
  );
}
