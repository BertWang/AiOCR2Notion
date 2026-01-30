-- CreateTable
CREATE TABLE "ConfigPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystemPreset" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "APIUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "statusCode" INTEGER NOT NULL,
    "executionTimeMs" INTEGER NOT NULL,
    "tokensUsed" INTEGER,
    "estimatedCost" REAL,
    "noteId" TEXT,
    "userId" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NoteVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT,
    "changeDescription" TEXT,
    "changeType" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exportType" TEXT NOT NULL,
    "targetPlatform" TEXT NOT NULL,
    "noteIds" TEXT NOT NULL,
    "noteCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "resultUrl" TEXT,
    "error" TEXT,
    "userId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "ConfigPreset_type_idx" ON "ConfigPreset"("type");

-- CreateIndex
CREATE INDEX "ConfigPreset_userId_idx" ON "ConfigPreset"("userId");

-- CreateIndex
CREATE INDEX "ConfigPreset_isDefault_idx" ON "ConfigPreset"("isDefault");

-- CreateIndex
CREATE INDEX "APIUsageLog_provider_idx" ON "APIUsageLog"("provider");

-- CreateIndex
CREATE INDEX "APIUsageLog_createdAt_idx" ON "APIUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "APIUsageLog_noteId_idx" ON "APIUsageLog"("noteId");

-- CreateIndex
CREATE INDEX "APIUsageLog_userId_idx" ON "APIUsageLog"("userId");

-- CreateIndex
CREATE INDEX "NoteVersion_noteId_idx" ON "NoteVersion"("noteId");

-- CreateIndex
CREATE INDEX "NoteVersion_createdAt_idx" ON "NoteVersion"("createdAt");

-- CreateIndex
CREATE INDEX "NoteVersion_noteId_versionNumber_idx" ON "NoteVersion"("noteId", "versionNumber");

-- CreateIndex
CREATE INDEX "ExportLog_userId_idx" ON "ExportLog"("userId");

-- CreateIndex
CREATE INDEX "ExportLog_status_idx" ON "ExportLog"("status");

-- CreateIndex
CREATE INDEX "ExportLog_createdAt_idx" ON "ExportLog"("createdAt");
