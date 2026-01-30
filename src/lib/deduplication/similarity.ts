/**
 * 筆記去重 - 相似度計算模組
 * 
 * 功能：
 * - 計算文字相似度（Levenshtein + Cosine Similarity）
 * - 計算圖片哈希（Perceptual Hash）
 * - 批次去重檢測
 */

import { distance as levenshteinDistance } from 'fastest-levenshtein';
import { compareTwoStrings } from 'string-similarity';

// ==================== 型別定義 ====================

export interface Note {
  id: string;
  refinedContent: string | null;
  rawOcrText: string | null;
  summary: string | null;
  imageUrl: string;
}

export interface SimilarityResult {
  noteId1: string;
  noteId2: string;
  textSimilarity: number;      // 0.0 - 1.0
  imageSimilarity?: number;    // 0.0 - 1.0 (如果有圖片)
  overallScore: number;        // 綜合相似度
  reason: string;              // 相似原因說明
}

export interface DuplicateGroup {
  groupId: string;
  notes: Note[];
  similarity: number;
  suggestedAction: 'merge' | 'review';
}

export interface DeduplicationOptions {
  textThreshold: number;       // 文字相似度閾值 (預設 0.85)
  imageThreshold?: number;     // 圖片相似度閾值 (預設 0.90)
  includeImages: boolean;      // 是否檢查圖片
  batchSize?: number;          // 批次處理大小
}

// ==================== 文字相似度計算 ====================

/**
 * 計算兩段文字的相似度（結合編輯距離和餘弦相似度）
 * @returns 0.0 - 1.0 的相似度分數
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  // 正規化文字
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  
  if (normalized1 === normalized2) return 1.0;
  
  // 1. Cosine Similarity (考慮詞彙重疊)
  const cosineSim = compareTwoStrings(normalized1, normalized2);
  
  // 2. Levenshtein Distance (考慮編輯距離)
  const maxLen = Math.max(normalized1.length, normalized2.length);
  const levDist = levenshteinDistance(normalized1, normalized2);
  const levSim = 1 - (levDist / maxLen);
  
  // 綜合兩種演算法（加權平均）
  const finalScore = (cosineSim * 0.6) + (levSim * 0.4);
  
  return Math.round(finalScore * 1000) / 1000; // 保留三位小數
}

/**
 * 正規化文字（移除空白、標點、統一大小寫）
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '') // 保留英文、數字、中文
    .replace(/\s+/g, ' ')
    .trim();
}

// ==================== 內容提取與比較 ====================

/**
 * 從筆記中提取可比較的文字內容
 */
export function extractComparableText(note: Note): string {
  // 優先使用 refinedContent，其次 rawOcrText，最後 summary
  return note.refinedContent || note.rawOcrText || note.summary || '';
}

/**
 * 比較兩個筆記的相似度
 */
export function compareNotes(
  note1: Note,
  note2: Note,
  options: Partial<DeduplicationOptions> = {}
): SimilarityResult {
  const text1 = extractComparableText(note1);
  const text2 = extractComparableText(note2);
  
  const textSimilarity = calculateTextSimilarity(text1, text2);
  
  // 計算綜合分數（目前僅基於文字，未來可擴充圖片）
  const overallScore = textSimilarity;
  
  // 判斷相似原因
  let reason = '';
  if (overallScore > 0.95) {
    reason = '內容幾乎完全相同';
  } else if (overallScore > 0.85) {
    reason = '內容高度相似';
  } else if (overallScore > 0.7) {
    reason = '內容部分重疊';
  } else {
    reason = '內容相似度較低';
  }
  
  return {
    noteId1: note1.id,
    noteId2: note2.id,
    textSimilarity,
    overallScore,
    reason,
  };
}

// ==================== 批次去重檢測 ====================

/**
 * 檢測一組筆記中的重複項
 * @returns 重複組陣列，每組包含相似的筆記
 */
export function findDuplicates(
  notes: Note[],
  options: Partial<DeduplicationOptions> = {}
): DuplicateGroup[] {
  const {
    textThreshold = 0.85,
    batchSize = 100,
  } = options;
  
  const duplicateGroups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();
  
  // 批次處理（避免一次比較過多筆記）
  const batches = Math.ceil(notes.length / batchSize);
  
  for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
    const batchStart = batchIdx * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, notes.length);
    const batch = notes.slice(batchStart, batchEnd);
    
    for (let i = 0; i < batch.length; i++) {
      const note1 = batch[i];
      
      // 跳過已處理的筆記
      if (processedIds.has(note1.id)) continue;
      
      const similarNotes: Note[] = [note1];
      
      // 與後續所有筆記比較
      for (let j = i + 1; j < notes.length; j++) {
        const note2 = notes[j];
        
        if (processedIds.has(note2.id)) continue;
        
        const result = compareNotes(note1, note2);
        
        if (result.overallScore >= textThreshold) {
          similarNotes.push(note2);
          processedIds.add(note2.id);
        }
      }
      
      // 如果找到相似筆記，建立重複組
      if (similarNotes.length > 1) {
        processedIds.add(note1.id);
        
        const avgSimilarity = similarNotes.length > 2 
          ? calculateGroupSimilarity(similarNotes)
          : compareNotes(similarNotes[0], similarNotes[1]).overallScore;
        
        duplicateGroups.push({
          groupId: `group-${note1.id}`,
          notes: similarNotes,
          similarity: avgSimilarity,
          suggestedAction: avgSimilarity > 0.95 ? 'merge' : 'review',
        });
      }
    }
  }
  
  return duplicateGroups;
}

/**
 * 計算一組筆記的平均相似度
 */
function calculateGroupSimilarity(notes: Note[]): number {
  let totalSim = 0;
  let comparisons = 0;
  
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const result = compareNotes(notes[i], notes[j]);
      totalSim += result.overallScore;
      comparisons++;
    }
  }
  
  return comparisons > 0 ? totalSim / comparisons : 0;
}

// ==================== 工具函數 ====================

/**
 * 計算文字長度（考慮中文字符）
 */
export function getTextLength(text: string): number {
  // 中文字符算 2，英文算 1
  return Array.from(text).reduce((len, char) => {
    return len + (/[\u4e00-\u9fa5]/.test(char) ? 2 : 1);
  }, 0);
}

/**
 * 檢查兩個筆記是否為精確重複
 */
export function isExactDuplicate(note1: Note, note2: Note): boolean {
  const text1 = extractComparableText(note1);
  const text2 = extractComparableText(note2);
  
  return normalizeText(text1) === normalizeText(text2);
}

/**
 * 產生去重報告摘要
 */
export function generateDeduplicationReport(groups: DuplicateGroup[]): string {
  const totalDuplicates = groups.reduce((sum, g) => sum + g.notes.length, 0);
  const uniqueNotes = totalDuplicates - groups.length; // 扣除每組的代表筆記
  
  return `
找到 ${groups.length} 組重複筆記，共 ${totalDuplicates} 份筆記
建議合併或刪除 ${uniqueNotes} 份重複內容

詳細分組：
${groups.map((g, idx) => `
  組 ${idx + 1}: ${g.notes.length} 份筆記 (相似度: ${(g.similarity * 100).toFixed(1)}%)
  建議操作: ${g.suggestedAction === 'merge' ? '自動合併' : '人工審查'}
`).join('')}
  `.trim();
}
