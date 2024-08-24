/*
  Warnings:

  - A unique constraint covering the columns `[genre,sonarrSeriesId]` on the table `SonarrSeriesGenre` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SonarrSeriesGenre_genre_sonarrSeriesId_key" ON "SonarrSeriesGenre"("genre", "sonarrSeriesId");
