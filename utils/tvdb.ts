import { cache, CacheKeys, CacheTTL } from '../lib/cache';
import type {
  TVDBLoginResponse,
  TVDBSearchResult,
  TVDBSearchEntry,
  AnimeSeries,
} from '../types/external';

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
