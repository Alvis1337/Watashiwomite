/*
  Warnings:

  - A unique constraint covering the columns `[malId]` on the table `Anime` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Anime" ALTER COLUMN "mainPictureLarge" SET DATA TYPE TEXT,
ALTER COLUMN "mainPictureMedium" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Anime_malId_key" ON "Anime"("malId");
