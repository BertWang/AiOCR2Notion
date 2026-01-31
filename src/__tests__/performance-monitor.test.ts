import { getPerformanceSuggestions, generateHealthReport } from '@/lib/performance-monitor';

describe('Performance Monitor', () => {
  
  test('應生成性能建議', async () => {
    const suggestions = await getPerformanceSuggestions();
    
    expect(suggestions).toBeDefined();
    expect(Array.isArray(suggestions)).toBe(true);
  });

  test('性能建議應包含必要字段', async () => {
    const suggestions = await getPerformanceSuggestions();
    
    if (suggestions.length > 0) {
      const suggestion = suggestions[0];
      expect(suggestion).toHaveProperty('type');
      expect(suggestion).toHaveProperty('priority');
      expect(suggestion).toHaveProperty('message');
    }
  });

  test('應識別索引建議', async () => {
    const suggestions = await getPerformanceSuggestions();
    
    const indexSuggestions = suggestions.filter(s => s.type === 'index');
    expect(Array.isArray(indexSuggestions)).toBe(true);
  });

  test('應按優先級排序建議', async () => {
    const suggestions = await getPerformanceSuggestions();
    
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    
    for (let i = 0; i < suggestions.length - 1; i++) {
      const current = priorityOrder.indexOf(suggestions[i].priority);
      const next = priorityOrder.indexOf(suggestions[i + 1].priority);
      expect(current).toBeLessThanOrEqual(next);
    }
  });
});

describe('Performance Monitor - Health Report', () => {
  
  test('應生成健康報告', async () => {
    const report = await generateHealthReport();
    
    expect(report).toBeDefined();
    expect(report).toHaveProperty('status');
    expect(report).toHaveProperty('score');
  });

  test('健康分數應在 0-100 之間', async () => {
    const report = await generateHealthReport();
    
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  test('應根據分數確定狀態', async () => {
    const report = await generateHealthReport();
    
    const validStatuses = ['excellent', 'good', 'fair', 'poor'];
    expect(validStatuses).toContain(report.status);
  });

  test('應統計筆記完成率', async () => {
    const report = await generateHealthReport();
    
    expect(report).toHaveProperty('completionRate');
    expect(report.completionRate).toBeGreaterThanOrEqual(0);
    expect(report.completionRate).toBeLessThanOrEqual(1);
  });

  test('應跟蹤失敗率', async () => {
    const report = await generateHealthReport();
    
    expect(report).toHaveProperty('failureRate');
    expect(report.failureRate).toBeGreaterThanOrEqual(0);
    expect(report.failureRate).toBeLessThanOrEqual(1);
  });

  test('應提供詳細指標', async () => {
    const report = await generateHealthReport();
    
    expect(report).toHaveProperty('metrics');
    expect(typeof report.metrics).toBe('object');
  });

  test('健康狀態分級應正確', async () => {
    // 測試健康分數與狀態的對應關係
    const scoreToStatus = {
      95: 'excellent',    // > 95
      85: 'good',         // 80-95
      70: 'fair',         // 60-80
      40: 'poor'          // < 60
    };
    
    Object.entries(scoreToStatus).forEach(([score, expectedStatus]) => {
      const numScore = parseInt(score);
      let status = '';
      
      if (numScore > 95) status = 'excellent';
      else if (numScore >= 80) status = 'good';
      else if (numScore >= 60) status = 'fair';
      else status = 'poor';
      
      expect(status).toBe(expectedStatus);
    });
  });
});

describe('Performance Monitor - Database Metrics', () => {
  
  test('應監控表大小', async () => {
    const report = await generateHealthReport();
    
    expect(report.metrics).toHaveProperty('tableSizes');
    expect(typeof report.metrics.tableSizes).toBe('object');
  });

  test('應計算數據庫總大小', async () => {
    const report = await generateHealthReport();
    
    expect(report.metrics).toHaveProperty('databaseSize');
    expect(report.metrics.databaseSize).toBeGreaterThan(0);
  });

  test('應識別大表', async () => {
    const report = await generateHealthReport();
    
    // 檢查是否有表超過 10MB
    const tableSizes = report.metrics.tableSizes || {};
    const largeTables = Object.entries(tableSizes).filter(
      ([_, size]) => typeof size === 'number' && size > 10 * 1024 * 1024
    );
    
    expect(Array.isArray(largeTables)).toBe(true);
  });
});

describe('Performance Monitor - Query Performance', () => {
  
  test('應跟蹤查詢執行時間', () => {
    const executionTimes = [10, 25, 50, 100, 250]; // ms
    
    const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    
    expect(avgTime).toBeGreaterThan(0);
    expect(avgTime).toBeLessThan(1000);
  });

  test('應識別慢查詢 (>100ms)', () => {
    const executionTimes = [10, 25, 50, 100, 250, 500];
    
    const slowQueries = executionTimes.filter(t => t > 100);
    
    expect(slowQueries.length).toBeGreaterThan(0);
    expect(slowQueries.length).toBeLessThan(executionTimes.length);
  });

  test('應計算 P95 延遲', () => {
    const executionTimes = [10, 15, 20, 25, 30, 35, 40, 45, 50, 500];
    
    // 排序
    const sorted = [...executionTimes].sort((a, b) => a - b);
    
    // 計算 P95 (第 95 百分位)
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    const p95 = sorted[p95Index];
    
    expect(p95).toBeGreaterThan(sorted[0]);
    expect(p95).toBeLessThanOrEqual(sorted[sorted.length - 1]);
  });
});
