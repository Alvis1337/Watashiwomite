/*
  Warnings:

  - A unique constraint covering the columns `[tvdbId]` on the table `Anime` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Anime" ADD COLUMN     "tvdbId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Anime_tvdbId_key" ON "Anime"("tvdbId");
