-- CreateTable
CREATE TABLE "SyncError" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "malId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "lastAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SyncError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncError_username_resolved_idx" ON "SyncError"("username", "resolved");

-- CreateIndex
CREATE INDEX "SyncError_malId_idx" ON "SyncError"("malId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncError_username_malId_key" ON "SyncError"("username", "malId");
