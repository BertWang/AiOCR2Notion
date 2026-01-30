/**
 * 版本資訊工具
 * 提供應用程式版本、構建時間和環境資訊
 */

export interface VersionInfo {
  version: string;
  buildTime: string;
  environment: string;
  nodeVersion: string;
  isValid: boolean;
  errors: string[];
}

/**
 * 驗證版本號格式 (Semantic Versioning)
 */
function validateVersion(version: string): boolean {
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
  return semverRegex.test(version) || version === 'dev';
}

/**
 * 驗證構建時間格式 (ISO 8601)
 */
function validateBuildTime(time: string): boolean {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoRegex.test(time);
}

/**
 * 驗證環境類型
 */
function validateEnvironment(env: string): boolean {
  return ['development', 'production', 'test'].includes(env);
}

// 快取版本資訊以提升效能
let cachedVersionInfo: VersionInfo | null = null;

export function getVersionInfo(): VersionInfo {
  // 使用快取避免重複計算
  if (cachedVersionInfo) {
    return cachedVersionInfo;
  }

  const errors: string[] = [];

  const version = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
  if (!validateVersion(version)) {
    errors.push(`Invalid version format: ${version}`);
  }

  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();
  if (!validateBuildTime(buildTime)) {
    errors.push(`Invalid build time format: ${buildTime}`);
  }

  const environment = process.env.NODE_ENV || 'development';
  if (!validateEnvironment(environment)) {
    errors.push(`Unknown environment: ${environment}`);
  }

  const nodeVersion = process.env.NEXT_PUBLIC_NODE_VERSION || process.version || 'unknown';

  cachedVersionInfo = {
    version,
    buildTime,
    environment,
    nodeVersion,
    isValid: errors.length === 0,
    errors,
  };

  // 在開發環境下記錄錯誤
  if (errors.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('[Version] Validation errors:', errors);
  }

  return cachedVersionInfo;
}

/**
 * 格式化版本資訊為易讀字串
 * 使用 ISO 格式確保伺服器和客戶端的一致性
 */
export function formatVersionInfo(info: VersionInfo): string {
  // 統一日期格式：YYYY/M/D (避免 locale 差異)
  const date = new Date(info.buildTime);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const formattedDate = `${year}/${month}/${day}`;
  
  return `v${info.version} | ${info.environment} | ${formattedDate}`;
}

/**
 * 重置快取 (主要用於測試)
 */
export function resetVersionCache(): void {
  cachedVersionInfo = null;
}
