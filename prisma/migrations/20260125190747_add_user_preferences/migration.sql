-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "syncWatching" BOOLEAN NOT NULL DEFAULT true,
    "syncCompleted" BOOLEAN NOT NULL DEFAULT false,
    "syncOnHold" BOOLEAN NOT NULL DEFAULT false,
    "syncDropped" BOOLEAN NOT NULL DEFAULT false,
    "syncPlanToWatch" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_username_key" ON "UserPreferences"("username");

-- CreateIndex
CREATE INDEX "UserPreferences_username_idx" ON "UserPreferences"("username");

-- CreateIndex
CREATE INDEX "Anime_malId_idx" ON "Anime"("malId");

-- CreateIndex
CREATE INDEX "Anime_animeListId_idx" ON "Anime"("animeListId");

-- CreateIndex
CREATE INDEX "Anime_tvdbId_idx" ON "Anime"("tvdbId");

-- CreateIndex
CREATE INDEX "AnimeList_username_idx" ON "AnimeList"("username");

-- CreateIndex
CREATE INDEX "SonarrSeries_tvdbId_idx" ON "SonarrSeries"("tvdbId");

-- CreateIndex
CREATE INDEX "SonarrSeries_malId_idx" ON "SonarrSeries"("malId");

-- CreateIndex
CREATE INDEX "SonarrSeries_animeListId_idx" ON "SonarrSeries"("animeListId");

-- CreateIndex
CREATE INDEX "SonarrSeries_title_idx" ON "SonarrSeries"("title");
