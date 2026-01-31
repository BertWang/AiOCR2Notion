import { analyzeNoteSimilarity, findRelatedNotes, buildNotesGraph, extractTopicClusters } from '@/lib/note-correlation';

// Mock 數據
const mockNotes = [
  {
    id: '1',
    refinedContent: 'Python programming basics and syntax',
    tags: 'programming,python,tutorial',
    createdAt: new Date('2026-01-01')
  },
  {
    id: '2',
    refinedContent: 'JavaScript ES6 features and modern syntax',
    tags: 'programming,javascript,web',
    createdAt: new Date('2026-01-02')
  },
  {
    id: '3',
    refinedContent: 'Python data analysis with pandas',
    tags: 'programming,python,data',
    createdAt: new Date('2026-01-03')
  },
  {
    id: '4',
    refinedContent: 'Java object-oriented programming',
    tags: 'programming,java,oop',
    createdAt: new Date('2026-01-04')
  }
];

describe('Note Correlation - Jaccard Similarity', () => {
  
  test('應計算兩個完全相同筆記的相似度為 1.0', () => {
    const note1 = mockNotes[0];
    const note2 = { ...note1, id: '1-copy' };
    
    const similarity = analyzeNoteSimilarity(note1, note2);
    expect(similarity.jaccardSimilarity).toBe(1.0);
  });

  test('應計算相關筆記的正確 Jaccard 相似度', () => {
    const note1 = mockNotes[0]; // Python basics
    const note3 = mockNotes[2]; // Python data analysis
    
    const similarity = analyzeNoteSimilarity(note1, note3);
    
    // 都有 'programming' 和 'python' 標籤
    // Jaccard = 交集/並集 = 2/4 = 0.5
    expect(similarity.jaccardSimilarity).toBeGreaterThan(0.3);
    expect(similarity.jaccardSimilarity).toBeLessThan(0.7);
  });

  test('應計算不相關筆記的低相似度', () => {
    const note1 = mockNotes[0]; // Python
    const note2 = mockNotes[1]; // JavaScript
    
    const similarity = analyzeNoteSimilarity(note1, note2);
    
    // 只有 'programming' 標籤相同
    expect(similarity.jaccardSimilarity).toBeLessThan(0.5);
  });

  test('應計算標籤相似度權重', () => {
    const note1 = mockNotes[0]; // tags: programming,python,tutorial
    const note3 = mockNotes[2]; // tags: programming,python,data
    
    const similarity = analyzeNoteSimilarity(note1, note3);
    
    // 標籤權重應該是 0.4
    expect(similarity.finalScore).toBeDefined();
  });

  test('應計算時間近度', () => {
    const note1 = mockNotes[0]; // 2026-01-01
    const note2 = mockNotes[1]; // 2026-01-02
    
    const similarity = analyzeNoteSimilarity(note1, note2);
    
    // 相差 1 天，應該有時間接近性分數
    expect(similarity.temporalSimilarity).toBeGreaterThan(0);
  });

  test('應正確計算最終相似度分數', () => {
    const note1 = mockNotes[0];
    const note3 = mockNotes[2];
    
    const similarity = analyzeNoteSimilarity(note1, note3);
    
    // 最終分數 = Jaccard * 0.4 + 標籤 * 0.4 + 時間 * 0.2
    expect(similarity.finalScore).toBeGreaterThanOrEqual(0);
    expect(similarity.finalScore).toBeLessThanOrEqual(1);
  });
});

describe('Note Correlation - Finding Related Notes', () => {
  
  test('應找到相關筆記', () => {
    const relatedNotes = findRelatedNotes(mockNotes[0], mockNotes);
    
    expect(relatedNotes).toBeDefined();
    expect(Array.isArray(relatedNotes)).toBe(true);
    expect(relatedNotes.length).toBeGreaterThan(0);
  });

  test('應返回相關性排序的筆記', () => {
    const relatedNotes = findRelatedNotes(mockNotes[0], mockNotes);
    
    // 檢查是否排序
    for (let i = 0; i < relatedNotes.length - 1; i++) {
      expect(relatedNotes[i].score).toBeGreaterThanOrEqual(relatedNotes[i + 1].score);
    }
  });

  test('應限制返回的相關筆記數量', () => {
    const relatedNotes = findRelatedNotes(mockNotes[0], mockNotes, 2);
    
    expect(relatedNotes.length).toBeLessThanOrEqual(2);
  });
});

describe('Note Correlation - Building Knowledge Graph', () => {
  
  test('應構建知識圖譜', () => {
    const graph = buildNotesGraph(mockNotes);
    
    expect(graph).toBeDefined();
    expect(graph.nodes).toBeDefined();
    expect(graph.edges).toBeDefined();
  });

  test('應為每個筆記創建節點', () => {
    const graph = buildNotesGraph(mockNotes);
    
    expect(graph.nodes.length).toBe(mockNotes.length);
    expect(graph.nodes.every(n => n.id && n.label)).toBe(true);
  });

  test('應創建相關筆記之間的邊', () => {
    const graph = buildNotesGraph(mockNotes);
    
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.edges[0]).toHaveProperty('source');
    expect(graph.edges[0]).toHaveProperty('target');
    expect(graph.edges[0]).toHaveProperty('weight');
  });

  test('邊的權重應在 0-1 之間', () => {
    const graph = buildNotesGraph(mockNotes);
    
    graph.edges.forEach(edge => {
      expect(edge.weight).toBeGreaterThanOrEqual(0);
      expect(edge.weight).toBeLessThanOrEqual(1);
    });
  });
});

describe('Note Correlation - Extracting Topic Clusters', () => {
  
  test('應提取主題聚類', () => {
    const clusters = extractTopicClusters(mockNotes);
    
    expect(clusters).toBeDefined();
    expect(Array.isArray(clusters)).toBe(true);
  });

  test('應按標籤分組筆記', () => {
    const clusters = extractTopicClusters(mockNotes);
    
    // 應該有 'programming' 集群
    const programmingCluster = clusters.find(c => c.topic === 'programming');
    expect(programmingCluster).toBeDefined();
    expect(programmingCluster.notes.length).toBeGreaterThan(1);
  });

  test('應識別 Python 相關的集群', () => {
    const clusters = extractTopicClusters(mockNotes);
    
    const pythonCluster = clusters.find(c => c.topic === 'python');
    expect(pythonCluster).toBeDefined();
    expect(pythonCluster.notes.length).toBe(2);
  });

  test('集群應包含正確的筆記', () => {
    const clusters = extractTopicClusters(mockNotes);
    
    const pythonCluster = clusters.find(c => c.topic === 'python');
    const pythonNoteIds = pythonCluster.notes.map(n => n.id);
    
    expect(pythonNoteIds).toContain('1');
    expect(pythonNoteIds).toContain('3');
  });
});
