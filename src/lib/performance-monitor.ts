import { prisma } from '@/lib/prisma';

/**
 * 性能監控和優化工具
 */

export interface PerformanceMetrics {
  queryTime: number; // ms
  cacheHit: boolean;
  timestamp: Date;
}

/**
 * 數據庫查詢性能優化建議
 */
export async function getPerformanceSuggestions() {
  try {
    // 1. 檢查表統計
    const noteCount = await prisma.note.count();
    const collectionCount = await prisma.collection.count();
    const searchHistoryCount = await prisma.searchHistory.count();

    // 2. 查找未索引的查詢
    const suggestions = [];

    // 如果筆記數過多且沒有有效索引
    if (noteCount > 1000) {
      suggestions.push({
        type: 'indexing',
        severity: 'high',
        message: `筆記數超過 ${noteCount}，建議為 status、createdAt 添加索引以加快搜尋`,
        recommendation: 'CREATE INDEX idx_note_status ON Note(status); CREATE INDEX idx_note_created ON Note(createdAt);',
      });
    }

    // 如果搜尋歷史過多
    if (searchHistoryCount > 10000) {
      suggestions.push({
        type: 'cleanup',
        severity: 'medium',
        message: `搜尋歷史過多 (${searchHistoryCount})，建議清理舊記錄`,
        recommendation: '刪除 30 天前的搜尋歷史以減少表大小',
      });
    }

    // 3. 檢查不完整的記錄
    const incompletedNotes = await prisma.note.count({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 超過 24 小時未完成
        },
      },
    });

    if (incompletedNotes > 0) {
      suggestions.push({
        type: 'stale_data',
        severity: 'medium',
        message: `有 ${incompletedNotes} 份筆記超過 24 小時未完成處理`,
        recommendation: '手動檢查這些筆記的處理狀態或重試失敗的任務',
      });
    }

    return suggestions;
  } catch (error) {
    console.error('Error getting performance suggestions:', error);
    return [];
  }
}

/**
 * 記錄查詢性能
 */
export async function logQueryPerformance(
  endpoint: string,
  queryTime: number,
  cacheHit: boolean = false
) {
  try {
    // 這裡可以存儲到另一個表或外部服務
    console.log(`[PERF] ${endpoint}: ${queryTime}ms ${cacheHit ? '(cached)' : ''}`);
  } catch (error) {
    console.error('Error logging query performance:', error);
  }
}

/**
 * 清理過期數據
 */
export async function cleanupStaleData(daysToKeep: number = 30) {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    // 清理舊搜尋歷史
    const deletedSearchHistory = await prisma.searchHistory.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    // 清理舊 API 使用日誌
    const deletedAPILogs = await prisma.aPIUsageLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    // 清理舊 MCP 同步日誌
    const deletedMCPLogs = await prisma.mCPSyncLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return {
      deletedSearchHistory: deletedSearchHistory.count,
      deletedAPILogs: deletedAPILogs.count,
      deletedMCPLogs: deletedMCPLogs.count,
    };
  } catch (error) {
    console.error('Error cleaning up stale data:', error);
    return { deletedSearchHistory: 0, deletedAPILogs: 0, deletedMCPLogs: 0 };
  }
}

/**
 * 生成系統健康報告
 */
export async function generateHealthReport() {
  try {
    const noteCount = await prisma.note.count();
    const completedCount = await prisma.note.count({ where: { status: 'COMPLETED' } });
    const failedCount = await prisma.note.count({ where: { status: 'FAILED' } });
    const collectionCount = await prisma.collection.count();

    const completionRate = noteCount > 0 ? (completedCount / noteCount) * 100 : 0;
    const failureRate = noteCount > 0 ? (failedCount / noteCount) * 100 : 0;

    return {
      timestamp: new Date(),
      notes: {
        total: noteCount,
        completed: completedCount,
        failed: failedCount,
        completionRate: completionRate.toFixed(2) + '%',
        failureRate: failureRate.toFixed(2) + '%',
      },
      collections: {
        total: collectionCount,
      },
      health: 
        completionRate > 95 ? 'excellent' :
        completionRate > 80 ? 'good' :
        completionRate > 60 ? 'fair' :
        'poor',
    };
  } catch (error) {
    console.error('Error generating health report:', error);
    return null;
  }
}
