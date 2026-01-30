-- AlterTable
ALTER TABLE "Note" ADD COLUMN "mcpMetadata" TEXT;
ALTER TABLE "Note" ADD COLUMN "mcpServicesUsed" TEXT;

-- CreateTable
CREATE TABLE "MCPServiceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "endpoint" TEXT,
    "authType" TEXT,
    "credentials" TEXT,
    "config" TEXT,
    "retryPolicy" TEXT,
    "rateLimitPerMinute" INTEGER,
    "timeoutMs" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "lastTestedAt" DATETIME,
    "lastTestStatus" TEXT,
    "lastTestError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MCPSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" TEXT,
    "output" TEXT,
    "error" TEXT,
    "executionTimeMs" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MCPSyncLog_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MCPCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceName" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "cachedData" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "MCPServiceConfig_type_idx" ON "MCPServiceConfig"("type");

-- CreateIndex
CREATE INDEX "MCPServiceConfig_enabled_idx" ON "MCPServiceConfig"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "MCPServiceConfig_name_key" ON "MCPServiceConfig"("name");

-- CreateIndex
CREATE INDEX "MCPSyncLog_noteId_idx" ON "MCPSyncLog"("noteId");

-- CreateIndex
CREATE INDEX "MCPSyncLog_serviceName_idx" ON "MCPSyncLog"("serviceName");

-- CreateIndex
CREATE INDEX "MCPSyncLog_status_idx" ON "MCPSyncLog"("status");

-- CreateIndex
CREATE INDEX "MCPSyncLog_createdAt_idx" ON "MCPSyncLog"("createdAt");

-- CreateIndex
CREATE INDEX "MCPSyncLog_noteId_serviceName_idx" ON "MCPSyncLog"("noteId", "serviceName");

-- CreateIndex
CREATE INDEX "MCPCache_expiresAt_idx" ON "MCPCache"("expiresAt");

-- CreateIndex
CREATE INDEX "MCPCache_serviceName_idx" ON "MCPCache"("serviceName");

-- CreateIndex
CREATE UNIQUE INDEX "MCPCache_serviceName_cacheKey_key" ON "MCPCache"("serviceName", "cacheKey");
