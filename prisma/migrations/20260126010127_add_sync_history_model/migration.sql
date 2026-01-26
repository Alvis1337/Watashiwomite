-- CreateTable
CREATE TABLE "SyncHistory" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedAnime" JSONB NOT NULL,
    "removedAnime" JSONB NOT NULL,
    "updatedAnime" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "SyncHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncHistory_username_syncedAt_idx" ON "SyncHistory"("username", "syncedAt");

-- CreateIndex
CREATE INDEX "SyncHistory_username_idx" ON "SyncHistory"("username");
