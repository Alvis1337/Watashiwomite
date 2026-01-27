import prisma from '../lib/prisma';
import type { MALUser, MALAnimeListResponse } from '../types/external';

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
