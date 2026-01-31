/*
  Warnings:

  - You are about to drop the `APIUsageLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConfigPreset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExportLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NoteVersion` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "APIUsageLog_userId_idx";

-- DropIndex
DROP INDEX "APIUsageLog_noteId_idx";

-- DropIndex
DROP INDEX "APIUsageLog_createdAt_idx";

-- DropIndex
DROP INDEX "APIUsageLog_provider_idx";

-- DropIndex
DROP INDEX "ConfigPreset_isDefault_idx";

-- DropIndex
DROP INDEX "ConfigPreset_userId_idx";

-- DropIndex
DROP INDEX "ConfigPreset_type_idx";

-- DropIndex
DROP INDEX "ExportLog_createdAt_idx";

-- DropIndex
DROP INDEX "ExportLog_status_idx";

-- DropIndex
DROP INDEX "ExportLog_userId_idx";

-- DropIndex
DROP INDEX "NoteVersion_noteId_versionNumber_idx";

-- DropIndex
DROP INDEX "NoteVersion_createdAt_idx";

-- DropIndex
DROP INDEX "NoteVersion_noteId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "APIUsageLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ConfigPreset";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ExportLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "NoteVersion";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "OCRProviderSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "apiKey" TEXT,
    "apiKeyEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "endpoint" TEXT,
    "config" TEXT,
    "avgResponseTimeMs" INTEGER,
    "successRate" REAL,
    "costPerRequest" REAL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rateLimitPerMin" INTEGER,
    "monthlyQuota" INTEGER,
    "monthlyUsage" INTEGER,
    "lastUsedAt" DATETIME,
    "lastErrorAt" DATETIME,
    "lastErrorMessage" TEXT,
    "displayName" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "aiProvider" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "modelName" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "config" TEXT,
    "enabledOCRProviders" TEXT DEFAULT 'gemini',
    "defaultOCRProvider" TEXT DEFAULT 'gemini',
    "enableFailover" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AdminSettings" ("aiProvider", "config", "createdAt", "id", "modelName", "updatedAt") SELECT "aiProvider", "config", "createdAt", "id", "modelName", "updatedAt" FROM "AdminSettings";
DROP TABLE "AdminSettings";
ALTER TABLE "new_AdminSettings" RENAME TO "AdminSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OCRProviderSetting_enabled_idx" ON "OCRProviderSetting"("enabled");

-- CreateIndex
CREATE INDEX "OCRProviderSetting_priority_idx" ON "OCRProviderSetting"("priority");

-- CreateIndex
CREATE INDEX "OCRProviderSetting_status_idx" ON "OCRProviderSetting"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OCRProviderSetting_provider_key" ON "OCRProviderSetting"("provider");
