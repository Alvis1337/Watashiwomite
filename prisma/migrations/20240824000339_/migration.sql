-- CreateTable
CREATE TABLE "SonarrSeries" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "alternateTitles" TEXT[],
    "sortTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "previousAiring" TIMESTAMP(3),
    "network" TEXT NOT NULL,
    "airTime" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "originalLanguage" TEXT NOT NULL,
    "seasons" JSONB NOT NULL,
    "year" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "qualityProfileId" INTEGER NOT NULL,
    "seasonFolder" BOOLEAN NOT NULL,
    "monitored" BOOLEAN NOT NULL,
    "monitorNewItems" TEXT NOT NULL,
    "useSceneNumbering" BOOLEAN NOT NULL,
    "runtime" INTEGER NOT NULL,
    "tvdbId" INTEGER NOT NULL,
    "tvRageId" INTEGER NOT NULL,
    "tvMazeId" INTEGER NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "firstAired" TIMESTAMP(3) NOT NULL,
    "lastAired" TIMESTAMP(3) NOT NULL,
    "seriesType" TEXT NOT NULL,
    "cleanTitle" TEXT NOT NULL,
    "imdbId" TEXT NOT NULL,
    "titleSlug" TEXT NOT NULL,
    "rootFolderPath" TEXT NOT NULL,
    "certification" TEXT NOT NULL,
    "added" TIMESTAMP(3) NOT NULL,
    "ratings" JSONB NOT NULL,
    "statistics" JSONB NOT NULL,
    "languageProfileId" INTEGER NOT NULL,
    "animeListId" INTEGER NOT NULL,

    CONSTRAINT "SonarrSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SonarrSeriesGenre" (
    "id" SERIAL NOT NULL,
    "genre" TEXT NOT NULL,
    "sonarrSeriesId" INTEGER NOT NULL,

    CONSTRAINT "SonarrSeriesGenre_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SonarrSeries" ADD CONSTRAINT "SonarrSeries_animeListId_fkey" FOREIGN KEY ("animeListId") REFERENCES "AnimeList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SonarrSeriesGenre" ADD CONSTRAINT "SonarrSeriesGenre_sonarrSeriesId_fkey" FOREIGN KEY ("sonarrSeriesId") REFERENCES "SonarrSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
