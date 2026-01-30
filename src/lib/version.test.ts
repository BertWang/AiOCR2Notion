import { getVersionInfo, formatVersionInfo, resetVersionCache } from './version';

describe('Version Utilities', () => {
  beforeEach(() => {
    // 重置快取
    resetVersionCache();
  });

  describe('getVersionInfo', () => {
    it('should return version info with all required fields', () => {
      const info = getVersionInfo();

      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('buildTime');
      expect(info).toHaveProperty('environment');
      expect(info).toHaveProperty('nodeVersion');
      expect(info).toHaveProperty('isValid');
      expect(info).toHaveProperty('errors');
    });

    it('should have non-empty version string', () => {
      const info = getVersionInfo();

      expect(typeof info.version).toBe('string');
      expect(info.version.length).toBeGreaterThan(0);
    });

    it('should have valid build time format', () => {
      const info = getVersionInfo();

      // ISO 8601 格式驗證
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(isoRegex.test(info.buildTime)).toBe(true);
    });

    it('should have valid environment', () => {
      const info = getVersionInfo();

      expect(['development', 'production', 'test']).toContain(info.environment);
    });

    it('should cache version info', () => {
      const info1 = getVersionInfo();
      const info2 = getVersionInfo();

      // 應該返回相同的物件實例（快取）
      expect(info1).toBe(info2);
    });

    it('should validate version format', () => {
      const info = getVersionInfo();

      // 版本應該符合 semver 或為 'dev'
      const isValidVersion = /^\d+\.\d+\.\d+/.test(info.version) || info.version === 'dev';
      expect(isValidVersion).toBe(true);
    });

    it('should mark as valid when all checks pass', () => {
      const info = getVersionInfo();

      if (info.errors.length === 0) {
        expect(info.isValid).toBe(true);
      } else {
        expect(info.isValid).toBe(false);
      }
    });
  });

  describe('formatVersionInfo', () => {
    it('should format version info correctly', () => {
      const mockInfo = {
        version: '0.1.0',
        buildTime: '2026-01-30T12:00:00Z',
        environment: 'production',
        nodeVersion: 'v20.0.0',
        isValid: true,
        errors: [],
      };

      const formatted = formatVersionInfo(mockInfo);

      expect(formatted).toContain('v0.1.0');
      expect(formatted).toContain('production');
    });

    it('should handle different environments', () => {
      const devInfo = {
        version: 'dev',
        buildTime: '2026-01-30T12:00:00Z',
        environment: 'development',
        nodeVersion: 'v20.0.0',
        isValid: true,
        errors: [],
      };

      const formatted = formatVersionInfo(devInfo);

      expect(formatted).toContain('vdev');
      expect(formatted).toContain('development');
    });
  });

  describe('resetVersionCache', () => {
    it('should clear the cache', () => {
      const info1 = getVersionInfo();
      resetVersionCache();
      const info2 = getVersionInfo();

      // 不應該是同一個物件實例
      expect(info1).not.toBe(info2);
    });
  });
});
