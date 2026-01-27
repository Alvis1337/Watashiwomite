import prisma from '../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../lib/cache';
import { getSettings } from '../lib/settings';
import type { SonarrSeries, SonarrRootFolder } from '../types/external';

/**
 * Gets the root folders configured in Sonarr
 * Uses caching since root folders rarely change
 * @returns Array of root folder objects
 * @throws Error if Sonarr API is unavailable
 */
export const getSonarrRootFolder = async (): Promise<SonarrRootFolder[]> => {
  const settings = await getSettings();
  const sonarrUrl = settings.sonarrUrl;
  const sonarrApiKey = settings.sonarrApiKey;

  if (!sonarrUrl || !sonarrApiKey) {
    throw new Error('Sonarr is not configured. Please complete setup.');
  }

  // Use cache for root folders (they rarely change)
  return cache.getOrSet(
    CacheKeys.sonarrRootFolders(),
    async () => {
      const response = await fetch(`${sonarrUrl}/api/v3/rootfolder`, {
        headers: {
          'X-Api-Key': sonarrApiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Sonarr API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      return (await response.json()) as SonarrRootFolder[];
    },
    CacheTTL.sonarrRootFolders
  );
};

/**
 * Gets all series from Sonarr
 * @returns Array of Sonarr series
 * @throws Error if Sonarr API is unavailable
 */
export const getSonarrAnimeList = async (): Promise<SonarrSeries[]> => {
  const settings = await getSettings();
  const sonarrUrl = settings.sonarrUrl;
  const sonarrApiKey = settings.sonarrApiKey;

  if (!sonarrUrl || !sonarrApiKey) {
    throw new Error('Sonarr is not configured. Please complete setup.');
  }

  try {
    const response = await fetch(`${sonarrUrl}/api/v3/series`, {
      headers: {
        'X-Api-Key': sonarrApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Sonarr API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return (await response.json()) as SonarrSeries[];
  } catch (error: any) {
    console.error('Failed to get Sonarr anime list:', error);
    throw error; // Re-throw the original error to preserve status codes
  }
};

/**
 * Saves Sonarr series data to database
 * Optimized version with batched genre operations
 * @param username - Username to associate series with
 * @param sonarrData - Array of Sonarr series to save
 */
export const saveSonarrSeries = async (
  username: string,
  sonarrData: SonarrSeries[]
): Promise<void> => {
  if (!username) {
    throw new Error('Username is required');
  }

  if (!Array.isArray(sonarrData) || sonarrData.length === 0) {
    console.warn('No Sonarr data to save');
    return;
  }

  try {
    // Get or create anime list for user
    const animeList = await prisma.animeList.upsert({
      where: { username },
      update: {},
      create: { username },
    });

    // Collect all genres for batch processing
    const genresToCreate: Array<{ genre: string; sonarrSeriesId: number }> = [];

    // Process each series
    for (const series of sonarrData) {
      try {
        const savedSeries = await prisma.sonarrSeries.upsert({
          where: { id: series.id },
          update: {
            title: series.title,
            alternateTitles: series.alternateTitles || [],
            sortTitle: series.sortTitle,
            status: series.status,
            overview: series.overview || 'None',
            previousAiring: series.previousAiring ? new Date(series.previousAiring) : undefined,
            network: series.network || 'None',
            airTime: series.airTime || null,
            images: series.images || [],
            originalLanguage: series.originalLanguage?.name || 'Unknown',
            seasons: series.seasons || [],
            year: series.year,
            path: series.path,
            qualityProfileId: series.qualityProfileId,
            seasonFolder: series.seasonFolder,
            monitored: series.monitored,
            monitorNewItems: series.monitorNewItems,
            useSceneNumbering: series.useSceneNumbering,
            runtime: series.runtime,
            tvdbId: series.tvdbId,
            tvRageId: series.tvRageId,
            tvMazeId: series.tvMazeId,
            tmdbId: series.tmdbId,
            firstAired: series.firstAired ? new Date(series.firstAired) : undefined,
            lastAired: series.lastAired ? new Date(series.lastAired) : undefined,
            seriesType: series.seriesType,
            cleanTitle: series.cleanTitle,
            imdbId: series.imdbId || '0',
            titleSlug: series.titleSlug,
            rootFolderPath: series.rootFolderPath,
            certification: series.certification || null,
            added: series.added ? new Date(series.added) : undefined,
            ratings: series.ratings || {},
            statistics: series.statistics || {},
            languageProfileId: series.languageProfileId,
            animeListId: animeList.id,
          },
          create: {
            id: series.id,
            title: series.title,
            alternateTitles: series.alternateTitles || [],
            sortTitle: series.sortTitle,
            status: series.status,
            overview: series.overview || 'None',
            previousAiring: series.previousAiring ? new Date(series.previousAiring) : undefined,
            network: series.network || 'None',
            airTime: series.airTime || null,
            images: series.images || [],
            originalLanguage: series.originalLanguage?.name || 'Unknown',
            seasons: series.seasons || [],
            year: series.year,
            path: series.path,
            qualityProfileId: series.qualityProfileId,
            seasonFolder: series.seasonFolder,
            monitored: series.monitored,
            monitorNewItems: series.monitorNewItems,
            useSceneNumbering: series.useSceneNumbering,
            runtime: series.runtime,
            tvdbId: series.tvdbId,
            tvRageId: series.tvRageId,
            tvMazeId: series.tvMazeId,
            tmdbId: series.tmdbId,
            firstAired: series.firstAired ? new Date(series.firstAired) : new Date(),
            lastAired: series.lastAired ? new Date(series.lastAired) : new Date(),
            seriesType: series.seriesType,
            cleanTitle: series.cleanTitle,
            imdbId: series.imdbId || '0',
            titleSlug: series.titleSlug,
            rootFolderPath: series.rootFolderPath,
            certification: series.certification || null,
            added: series.added ? new Date(series.added) : new Date(),
            ratings: series.ratings || {},
            statistics: series.statistics || {},
            languageProfileId: series.languageProfileId,
            animeListId: animeList.id,
          },
        });

        // Collect genres for batch insert (fixes N+1 query)
        if (series.genres && Array.isArray(series.genres)) {
          for (const genre of series.genres) {
            genresToCreate.push({
              genre: genre,
              sonarrSeriesId: savedSeries.id,
            });
          }
        }
      } catch (seriesError) {
        console.error(`Failed to save series ${series.title}:`, seriesError);
        // Continue with next series instead of failing completely
      }
    }

    // Batch insert all genres (much faster than individual upserts)
    if (genresToCreate.length > 0) {
      try {
        await prisma.sonarrSeriesGenre.createMany({
          data: genresToCreate,
          skipDuplicates: true, // Handles uniqueness constraint
        });
      } catch (genreError) {
        console.error('Failed to batch insert genres:', genreError);
        // Don't fail the entire operation if genres fail
      }
    }

  } catch (error) {
    console.error('Error saving Sonarr series:', error);
    throw new Error('Failed to save Sonarr series to database');
  }
};
