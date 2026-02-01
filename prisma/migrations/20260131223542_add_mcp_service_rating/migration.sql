-- CreateTable
CREATE TABLE "MCPServiceRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "rating" INTEGER,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "review" TEXT,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "MCPServiceRating_serviceName_idx" ON "MCPServiceRating"("serviceName");

-- CreateIndex
CREATE INDEX "MCPServiceRating_rating_idx" ON "MCPServiceRating"("rating");

-- CreateIndex
CREATE INDEX "MCPServiceRating_isFavorite_idx" ON "MCPServiceRating"("isFavorite");

-- CreateIndex
CREATE INDEX "MCPServiceRating_createdAt_idx" ON "MCPServiceRating"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MCPServiceRating_serviceId_userId_key" ON "MCPServiceRating"("serviceId", "userId");
