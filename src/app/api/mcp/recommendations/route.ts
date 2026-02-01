import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const prismaClient = prisma as any;

interface ServiceScore {
  serviceId: string;
  serviceName: string;
  displayName: string;
  score: number;
  breakdown: {
    popularityScore: number; // 安裝數和下載量
    ratingScore: number; // 平均評分
    userRatingScore: number; // 用戶個人評分
    favoriteScore: number; // 是否已收藏
    successRateScore: number; // 成功測試率
  };
  userRelevance: string; // 推薦原因
  rank: number;
}

/**
 * 計算單個服務的推薦分數
 */
function calculateServiceScore(
  service: any,
  userFavorites: Set<string>,
  userRatings: Map<string, number>,
  successRates: Map<string, number>
): ServiceScore {
  const serviceId = service.id;
  const isFavorite = userFavorites.has(serviceId);
  const userRating = userRatings.get(serviceId) || 0;
  const successRate = successRates.get(serviceId) || 0.5;

  // 1. 流行度分數 (0-20 分) - 基於安裝數
  const popularityScore = Math.min(
    20,
    (service.totalInstalls / 100) * 10 + (service.totalInstalls > 50 ? 10 : 0)
  );

  // 2. 評分分數 (0-25 分) - 服務平均評分
  const ratingScore = ((service.rating || 0) / 5) * 25;

  // 3. 用戶評分分數 (0-20 分) - 用戶個人評分加倍權重
  const userRatingScore = (userRating / 5) * 20;

  // 4. 收藏分數 (0-15 分) - 用戶是否已收藏
  const favoriteScore = isFavorite ? 15 : 0;

  // 5. 成功率分數 (0-20 分) - 連接測試成功率
  const successRateScore = successRate * 20;

  // 計算總分
  const totalScore =
    popularityScore +
    ratingScore +
    userRatingScore +
    favoriteScore +
    successRateScore;

  // 決定推薦原因
  let userRelevance = "";
  if (isFavorite) {
    userRelevance = "你已收藏此服務";
  } else if (userRating > 3) {
    userRelevance = "根據你的評分";
  } else if (successRate > 0.8) {
    userRelevance = "連接穩定性高";
  } else if (service.totalInstalls > 100) {
    userRelevance = "熱門服務";
  } else if (service.rating > 4) {
    userRelevance = "用戶評分高";
  } else {
    userRelevance = "推薦給你";
  }

  return {
    serviceId,
    serviceName: service.name,
    displayName: service.displayName,
    score: Math.round(totalScore * 10) / 10,
    breakdown: {
      popularityScore: Math.round(popularityScore * 10) / 10,
      ratingScore: Math.round(ratingScore * 10) / 10,
      userRatingScore: Math.round(userRatingScore * 10) / 10,
      favoriteScore: Math.round(favoriteScore * 10) / 10,
      successRateScore: Math.round(successRateScore * 10) / 10,
    },
    userRelevance,
    rank: 0,
  };
}

/**
 * 獲取推薦的 MCP 服務
 * GET /api/mcp/recommendations?limit=10&userId=default
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const userId = searchParams.get("userId") || "default";
    const excludeInstalled = searchParams.get("excludeInstalled") === "true";

    // 1. 獲取所有可用的服務
    const allServices = await prismaClient.mCPServiceRegistry.findMany({
      where: { isActive: true },
      take: 100,
    });

    if (allServices.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: "No services available for recommendations",
      });
    }

    // 2. 獲取用戶的收藏和評分
    const userFavorites = new Set<string>();
    const userRatings = new Map<string, number>();

    const favorites = await prismaClient.mCPServiceFavorite.findMany({
      where: { userId },
    });

    favorites.forEach((fav: any) => {
      userFavorites.add(fav.serviceId);
    });

    const ratings = await prismaClient.mCPServiceRating.findMany({
      where: { userId },
    });

    ratings.forEach((rating: any) => {
      userRatings.set(rating.serviceId, rating.rating);
    });

    // 3. 獲取用戶已安裝的服務
    let installedServiceIds = new Set<string>();
    if (excludeInstalled) {
      const installed = await prismaClient.mCPServiceConfig.findMany({
        where: {},
      });

      installedServiceIds = new Set(
        installed.map((s: any) => {
          // 根據名稱或 ID 匹配
          const registry = allServices.find(
            (svc: any) => svc.name === s.name || svc.id === s.name
          );
          return registry?.id;
        })
      );
    }

    // 4. 計算每個服務的成功率
    const successRates = new Map<string, number>();
    const syncLogs = await prismaClient.mCPSyncLog.findMany({
      where: {
        action: "test_connection",
      },
    });

    const logsByService = new Map<string, { success: number; total: number }>();

    syncLogs.forEach((log: any) => {
      const serviceName = log.serviceName;
      if (!logsByService.has(serviceName)) {
        logsByService.set(serviceName, { success: 0, total: 0 });
      }

      const stats = logsByService.get(serviceName)!;
      stats.total++;
      if (log.status === "success") {
        stats.success++;
      }
    });

    logsByService.forEach((stats, serviceName) => {
      const rate = stats.success / stats.total;
      const service = allServices.find((s: any) => s.name === serviceName);
      if (service) {
        successRates.set(service.id, rate);
      }
    });

    // 5. 計算所有服務的推薦分數
    const scores = allServices
      .filter((service: any) =>
        excludeInstalled ? !installedServiceIds.has(service.id) : true
      )
      .map((service: any) =>
        calculateServiceScore(service, userFavorites, userRatings, successRates)
      );

    // 6. 按分數排序
    scores.sort((a: ServiceScore, b: ServiceScore) => b.score - a.score);

    // 7. 添加排名
    scores.forEach((score: ServiceScore, idx: number) => {
      score.rank = idx + 1;
    });

    // 8. 返回前 N 個推薦
    const recommendations = scores.slice(0, limit);

    return NextResponse.json({
      success: true,
      recommendations,
      total: scores.length,
      algorithm: {
        version: "1.0",
        factors: [
          "Popularity (20%)",
          "Service Rating (25%)",
          "User Rating (20%)",
          "Favorites (15%)",
          "Success Rate (20%)",
        ],
      },
    });
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

/**
 * 個性化推薦（基於用戶的使用模式）
 * GET /api/mcp/recommendations/personalized?userId=default&category=search
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = "default", category = null, serviceTypes = [] } = body;

    // 獲取用戶最常使用的服務類型
    const usageLogs = await prismaClient.mCPSyncLog.findMany({
      where: {
        userId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const serviceTypeFrequency = new Map<string, number>();
    usageLogs.forEach((log: any) => {
      const type = log.serviceName;
      serviceTypeFrequency.set(
        type,
        (serviceTypeFrequency.get(type) || 0) + 1
      );
    });

    // 獲取與用戶偏好相關的服務
    let query: any = { isActive: true };
    if (category) {
      query.category = category;
    }
    if (serviceTypes.length > 0) {
      query.type = { in: serviceTypes };
    }

    const relatedServices = await prismaClient.mCPServiceRegistry.findMany({
      where: query,
      take: 20,
    });

    // 計算個性化分數
    const userFavorites = new Set<string>();
    const userRatings = new Map<string, number>();

    const favorites = await prismaClient.mCPServiceFavorite.findMany({
      where: { userId },
    });
    favorites.forEach((fav: any) => {
      userFavorites.add(fav.serviceId);
    });

    const ratings = await prismaClient.mCPServiceRating.findMany({
      where: { userId },
    });
    ratings.forEach((rating: any) => {
      userRatings.set(rating.serviceId, rating.rating);
    });

    const successRates = new Map<string, number>();
    // ... 計算成功率 (同上) ...

    const scores = relatedServices.map((service: any) =>
      calculateServiceScore(service, userFavorites, userRatings, successRates)
    );

    scores.sort((a: ServiceScore, b: ServiceScore) => b.score - a.score);

    return NextResponse.json({
      success: true,
      personalized: true,
      recommendations: scores.slice(0, 10),
      userPreferences: {
        favoriteCount: userFavorites.size,
        ratedCount: userRatings.size,
        topServiceTypes: Array.from(serviceTypeFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type, count]) => ({ type, count })),
      },
    });
  } catch (error) {
    console.error("Failed to generate personalized recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
