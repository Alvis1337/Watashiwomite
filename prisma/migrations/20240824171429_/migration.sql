/*
  Warnings:

  - Changed the type of `alternateTitles` on the `SonarrSeries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "SonarrSeries" DROP COLUMN "alternateTitles",
ADD COLUMN     "alternateTitles" JSONB NOT NULL;
