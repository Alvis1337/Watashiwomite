/*
  Warnings:

  - A unique constraint covering the columns `[malId]` on the table `SonarrSeries` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `malId` to the `SonarrSeries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SonarrSeries" ADD COLUMN     "malId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SonarrSeries_malId_key" ON "SonarrSeries"("malId");
