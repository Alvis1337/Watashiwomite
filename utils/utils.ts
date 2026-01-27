import prisma from '../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../lib/cache';
import { getSettings } from '../lib/settings';
import type {
  SonarrSeries,
  SonarrRootFolder,
  MALUser,
  MALAnimeListResponse,
  TVDBLoginResponse,
  TVDBSearchResult,
  TVDBSearchEntry,
  AnimeSeries,
} from '../types/external';

/**
 * Gets the username from a MyAnimeList access token
 * @param token - MAL OAuth access token
 * @returns Username string
 * @throws Error if request fails or token is invalid
 */
export const getUsernameFromToken = async (token: string): Promise<string> => {
  if (!token) {
    throw new Error('Token is required');
  }

  const usernameUrl = 'https://api.myanimelist.net/v2/users/@me';

  try {
    const response = await fetch(usernameUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`MAL API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as MALUser;
    return data.name;
  } catch (error) {
    console.error('Failed to get username from token:', error);
    throw new Error('Failed to fetch username from MyAnimeList');
  }
};

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

/**
 * Authenticates with TVDB API and returns a token
 * Uses caching to avoid repeated authentication
 * @param tvdbApiKey - TVDB API key
 * @returns TVDB login response with token
 * @throws Error if authentication fails
 */
export const tvdbLogin = async (tvdbApiKey: string): Promise<TVDBLoginResponse> => {
  if (!tvdbApiKey) {
    throw new Error('TVDB API key is required');
  }

  // Check cache first
  const cacheKey = CacheKeys.tvdbToken();
  const cachedToken = cache.get<TVDBLoginResponse>(cacheKey);

  if (cachedToken) {
    return cachedToken;
  }


  try {
    const response = await fetch('https://api4.thetvdb.com/v4/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: tvdbApiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`TVDB login failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as TVDBLoginResponse;

    if (!data.data?.token) {
      throw new Error('TVDB login response missing token');
    }

    // Cache the token
    cache.set(cacheKey, data, CacheTTL.tvdbToken);

    return data;
  } catch (error) {
    console.error('TVDB login error:', error);
    throw new Error('Failed to authenticate with TVDB');
  }
};

/**
 * Gets TVDB IDs for a list of anime titles
 * Searches TVDB for each anime and returns matching series IDs
 * Uses parallel requests for better performance
 * @param animeList - Array of anime titles to search for
 * @param tvdbApiKey - TVDB API key
 * @returns Array of objects with title and tvdbId
 */
export const getTvdbIds = async (
  animeList: string[],
  tvdbApiKey: string | undefined
): Promise<AnimeSeries[]> => {
  if (!tvdbApiKey) {
    throw new Error('TVDB API key is required');
  }

  if (!Array.isArray(animeList) || animeList.length === 0) {
    console.warn('No anime titles to search');
    return [];
  }

  try {
    const tvdbToken = await tvdbLogin(tvdbApiKey);

    if (!tvdbToken?.data?.token) {
      throw new Error('Failed to obtain TVDB token');
    }

    // Parallelize TVDB searches for much better performance
    const searchPromises = animeList.map(async (animeTitle): Promise<AnimeSeries | null> => {
      try {
        const searchUrl = `https://api4.thetvdb.com/v4/search?query=${encodeURIComponent(animeTitle)}`;

        const response = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${tvdbToken.data.token}`,
          },
        });

        if (!response.ok) {
          console.warn(`TVDB search failed for ${animeTitle}: ${response.status}`);
          return null;
        }

        const data = (await response.json()) as TVDBSearchResult;

        if (!data.data || !Array.isArray(data.data)) {
          console.warn(`No TVDB data returned for ${animeTitle}`);
          return null;
        }

        // Find the preferred series (anime/animation in Japanese or English)
        const preferredSeries = data.data.find(
          (entry: TVDBSearchEntry) =>
            entry.genres &&
            entry.primary_type !== 'movie' &&
            (entry.genres.includes('Anime') || entry.genres.includes('Animation')) &&
            (entry.primary_language === 'jpn' || entry.primary_language === 'eng')
        );

        // Fallback to first available series
        const firstAvailableSeries = data.data.find(
          (entry: TVDBSearchEntry) => entry.primary_type === 'series'
        );

        if (preferredSeries) {
          const tvdbId = preferredSeries.id.replace('series-', '');
          return { title: animeTitle, tvdbId };
        } else if (firstAvailableSeries) {
          const tvdbId = firstAvailableSeries.id.replace(/^(series-|movie-)/, '');
          return { title: animeTitle, tvdbId };
        } else {
          console.warn(`No series found for ${animeTitle}`);
          return null;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error fetching TVDB ID for ${animeTitle}:`, errorMessage);
        return null;
      }
    });

    // Wait for all searches to complete
    const results = await Promise.all(searchPromises);

    // Filter out null results
    const tvdbIds = results.filter((result): result is AnimeSeries => result !== null);

    return tvdbIds;
  } catch (error) {
    console.error('Error in getTvdbIds:', error);
    throw new Error('Failed to get TVDB IDs');
  }
};

/**
 * Gets anime list from MyAnimeList and saves to database
 * @param token - MAL OAuth access token
 * @param username - MAL username
 * @returns Array of saved anime records
 */
export const getMALAnimeList = async (token: string, username: string): Promise<any[]> => {
  if (!token) {
    throw new Error('MAL token is required');
  }

  if (!username) {
    throw new Error('Username is required');
  }

  // Fetch all statuses from MAL
  const statuses = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'];
  const animeList: any[] = [];

  try {
    // Fetch each status in parallel for better performance
    const fetchPromises = statuses.map(async status => {
      const url = `https://api.myanimelist.net/v2/users/@me/animelist?status=${status}&fields=list_status,main_picture&limit=1000`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        if (!response.ok) {
          console.warn(
            `MAL API error for status ${status}: ${response.status} ${response.statusText}`
          );
          return [];
        }

        const data = (await response.json()) as MALAnimeListResponse;

        if (!data.data || !Array.isArray(data.data)) {
          console.warn(`No anime data returned from MAL for status: ${status}`);
          return [];
        }

        return data.data;
      } catch (error) {
        console.error(`Error fetching ${status} list:`, error);
        return [];
      }
    });

    // Wait for all fetches to complete
    const allResults = await Promise.all(fetchPromises);
    const allAnime = allResults.flat();


    // Process each anime
    for (const item of allAnime) {
      try {
        const savedAnime = await prisma.anime.upsert({
          where: { malId: item.node.id },
          update: {
            title: item.node.title,
            mainPictureMedium: item.node.main_picture?.medium || null,
            mainPictureLarge: item.node.main_picture?.large || null,
            status: item.list_status.status,
            score: item.list_status.score || null,
            numEpisodesWatched: item.list_status.num_episodes_watched || null,
            isRewatching: item.list_status.is_rewatching,
            updatedAtMAL: new Date(item.list_status.updated_at),
            startDate: item.list_status.start_date ? new Date(item.list_status.start_date) : null,
          },
          create: {
            malId: item.node.id,
            title: item.node.title,
            mainPictureMedium: item.node.main_picture?.medium || null,
            mainPictureLarge: item.node.main_picture?.large || null,
            status: item.list_status.status,
            score: item.list_status.score || null,
            numEpisodesWatched: item.list_status.num_episodes_watched || null,
            isRewatching: item.list_status.is_rewatching,
            updatedAtMAL: new Date(item.list_status.updated_at),
            startDate: item.list_status.start_date ? new Date(item.list_status.start_date) : null,
            animeList: {
              connectOrCreate: {
                where: { username },
                create: { username },
              },
            },
          },
        });

        animeList.push(savedAnime);
      } catch (animeError) {
        console.error(`Failed to save anime ${item.node.title}:`, animeError);
        // Continue with next anime
      }
    }

    return animeList;
  } catch (error) {
    console.error('Error fetching MAL anime list:', error);
    throw new Error('Failed to fetch anime list from MyAnimeList');
  }
};
