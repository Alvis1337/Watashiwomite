/*
  Warnings:

  - Added the required column `isRewatching` to the `Anime` table without a default value. This is not possible if the table is not empty.
  - Added the required column `malId` to the `Anime` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Anime` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Anime" ADD COLUMN     "isRewatching" BOOLEAN NOT NULL,
ADD COLUMN     "mainPictureLarge" VARCHAR(255),
ADD COLUMN     "mainPictureMedium" VARCHAR(255),
ADD COLUMN     "malId" INTEGER NOT NULL,
ADD COLUMN     "numEpisodesWatched" INTEGER,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "status" VARCHAR(50) NOT NULL,
ADD COLUMN     "updatedAtMAL" TIMESTAMP(3);
