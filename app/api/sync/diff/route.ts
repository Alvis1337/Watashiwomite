import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getTvdbIds, getSonarrRootFolder } from '@/utils/utils';
import { addAnimeToSonarrEnhanced } from '@/utils/enhancedSync';
import { logSyncHistory, SyncChange } from '@/utils/syncHistory';
import { executeAfterSyncActions } from '@/utils/batchActions';
import type { Anime } from '@/types/interfaces';

/**
 * @swagger
 * tags:
 *   name: Sync
 *   description: Operations for syncing MAL and Sonarr lists
 */

/**
 * @swagger
 * /api/sync/diff:
 *   get:
 *     summary: Sync MAL and Sonarr lists and return differences
 *     description: Syncs the anime lists between MyAnimeList (MAL) and Sonarr, and returns any differences. Optionally fetches additional TVDB IDs for new MAL entries and adds them to Sonarr.
 *     tags: [Sync]
 *     parameters:
 *       - name: username
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           description: The username for the MAL account.
 *       - name: diff
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - true
 *             - false
 *           description: If 'true', returns the difference between MAL and Sonarr lists. If 'false' or omitted, performs the sync operation.
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                           title:
 *                             type: string
 *                       description: List of results from adding new anime to Sonarr (only included if diff is false).
 *                     diff:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of anime titles unique to MAL (only included if diff is true or no changes detected).
 *                     lists:
 *                       type: object
 *                       properties:
 *                         mal:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: List of anime titles from MAL.
 *                         sonarr:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: number
 *                               titles:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                             description: List of Sonarr series with their alternate titles.
 *                       description: Lists of anime from MAL and Sonarr.
 *       '400':
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Username is required.'
 *       '401':
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Your Sonarr is out of sync, please resolve manually.'
 *       '500':
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'TVDB API key is missing.'
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const username = url.searchParams.get('username');
  let diff = url.searchParams.get('diff');
  const removeUnsynced = url.searchParams.get('removeUnsynced') === 'true';


  try {
    // For internal API calls, always use http in development to avoid SSL issues
    // In production, NEXT_PUBLIC_BASE_URL should be set properly
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.NODE_ENV === 'production'
        ? `${req.nextUrl.protocol}//${req.nextUrl.host}`
        : `http://localhost:${req.nextUrl.port || 3000}`);

    const syncSonarr = await fetch(`${baseUrl}/api/sonarr/sync?username=${username}`);
    if (!syncSonarr.ok) throw new Error('Failed to sync Sonarr list');

    const syncMal = await fetch(`${baseUrl}/api/mal?username=${username}`);
    if (!syncMal.ok) throw new Error('Failed to sync MAL list');
  } catch (e) {
    console.error('Failed to sync your lists before the operation:', e);
  }

  if (!username) {
    return NextResponse.json({ message: 'Username is required.' }, { status: 400 });
  }

  // Load user preferences to filter which lists to sync
  const userPreferences = await prisma.userPreferences.findUnique({
    where: { username },
  });

  // Default preferences if not found
  const preferences = userPreferences || {
    syncWatching: true,
    syncCompleted: false,
    syncOnHold: false,
    syncDropped: false,
    syncPlanToWatch: true,
  };

  const userList = await prisma.animeList.findUnique({
    where: { username },
    include: {
      anime: true,
      sonarrSeries: true,
    },
  });

  if (!userList?.anime || !userList?.sonarrSeries) {
    return NextResponse.json({ message: "Failed to pull user's MAL list." }, { status: 400 });
  }

  // Filter anime based on user preferences
  const filteredAnime = userList.anime.filter((anime: any) => {
    const status = anime.status.toLowerCase().replace(/ /g, '_');
    switch (status) {
      case 'watching':
        return preferences.syncWatching;
      case 'completed':
        return preferences.syncCompleted;
      case 'on_hold':
        return preferences.syncOnHold;
      case 'dropped':
        return preferences.syncDropped;
      case 'plan_to_watch':
        return preferences.syncPlanToWatch;
      default:
        return false;
    }
  });

  if (filteredAnime.length === 0 && !removeUnsynced) {
    return NextResponse.json({
      message: 'No anime lists selected for syncing.',
      success: true,
      data: { results: [] },
    });
  }

  // Handle removal of unsynced anime if requested
  if (removeUnsynced) {
    // Find anime that are NOT in filtered list (unsynced)
    const unsyncedAnime = userList.anime.filter((anime: any) => {
      const status = anime.status.toLowerCase().replace(/ /g, '_');
      switch (status) {
        case 'watching':
          return !preferences.syncWatching;
        case 'completed':
          return !preferences.syncCompleted;
        case 'on_hold':
          return !preferences.syncOnHold;
        case 'dropped':
          return !preferences.syncDropped;
        case 'plan_to_watch':
          return !preferences.syncPlanToWatch;
        default:
          return false;
      }
    });

    if (unsyncedAnime.length > 0) {
      const malIdsToRemove = unsyncedAnime.map((a: any) => a.malId);

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          (process.env.NODE_ENV === 'production'
            ? `${req.nextUrl.protocol}//${req.nextUrl.host}`
            : `http://localhost:${req.nextUrl.port || 3000}`);

        const removeResponse = await fetch(`${baseUrl}/api/sonarr/remove`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            malIds: malIdsToRemove,
          }),
        });

        if (!removeResponse.ok) {
          console.error('Failed to remove anime from Sonarr:', await removeResponse.text());
        }
      } catch (error) {
        console.error('Error removing anime from Sonarr:', error);
      }
    }
  }

  function normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a: string, b: string): number {
    const alen = a.length;
    const blen = b.length;

    if (alen === 0) return blen;
    if (blen === 0) return alen;

    const matrix: number[][] = Array.from({ length: alen + 1 }, () => Array(blen + 1).fill(0));

    for (let i = 0; i <= alen; i++) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= blen; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= alen; i++) {
      for (let j = 1; j <= blen; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[alen][blen];
  }

  function findClosestMatch(
    title: string,
    candidates: string[],
    threshold: number = 5
  ): string | null {
    const normalizedTitle = normalizeTitle(title);
    let closestMatch: string | null = null;
    let closestDistance = threshold;

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeTitle(candidate);
      const distance = levenshtein(normalizedTitle, normalizedCandidate);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestMatch = candidate;
      }
    }

    return closestMatch;
  }

  // If no anime to sync, skip the diff comparison and return success
  if (filteredAnime.length === 0) {
    return NextResponse.json({
      message: 'All anime removed from Sonarr successfully',
      success: true,
      data: { results: [] },
    });
  }

  const animeTitles = filteredAnime.map((a: any) => a.title);

  const sonarrSeries = userList.sonarrSeries.map((s: any) => {
    const alternateTitles = Array.isArray(s.alternateTitles)
      ? s.alternateTitles
          .map((at: any) =>
            typeof at === 'object' && at !== null && 'title' in at
              ? (at.title as string).toLowerCase()
              : null
          )
          .filter((title: any): title is string => title !== null)
      : [];
    return {
      id: s.id,
      titles: [s.title.toLowerCase(), ...alternateTitles],
    };
  });

  const sonarrTitles = sonarrSeries.flatMap((series: any) => series.titles);
  const sonarrTitlesSet = new Set<string>(sonarrTitles);

  const uniqueToMal = animeTitles.filter((title: string) => {
    const match = findClosestMatch(title, Array.from(sonarrTitlesSet));
    return !match || levenshtein(normalizeTitle(title), normalizeTitle(match)) > 5;
  });

  const uniqueToSonarr = Array.from(sonarrTitlesSet).filter((title: string) => {
    const match = findClosestMatch(title, animeTitles);
    return !match || levenshtein(normalizeTitle(title), normalizeTitle(match)) > 5;
  });

  for (const series of sonarrSeries) {
    for (const title of series.titles) {
      const closestMatch = findClosestMatch(title, animeTitles);

      if (closestMatch) {
        const anime = await prisma.anime.findFirst({
          where: { title: closestMatch },
        });

        if (!anime) {
          continue;
        }

        if (anime) {
          const id = series.id;

          await prisma.sonarrSeries.update({
            where: { id },
            data: { malId: anime.malId },
          });
        }
      }
    }
  }

  if (uniqueToMal.length > 0) {
    if (diff === 'true') {
      return NextResponse.json({
        diff: uniqueToMal,
        lists: { mal: animeTitles, sonarr: sonarrTitles },
      });
    } else {
      const tvdbidApiKey = process.env.TVDBID_API_KEY;
      const tvdbids = await getTvdbIds(uniqueToMal, tvdbidApiKey);
      const rootFolder = await getSonarrRootFolder();

      // Check if root folder exists
      if (!rootFolder || rootFolder.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              'No root folders configured in Sonarr. Please add a root folder in Sonarr Settings → Media Management → Root Folders.',
          },
          { status: 400 }
        );
      }

      // Create results array with both found and not found anime
      // Build anime data map for enhanced sync features
      const animeDataMap = new Map<number, Anime>();
      filteredAnime.forEach((anime: any) => {
        if (anime.malId) {
          animeDataMap.set(anime.malId, anime as Anime);
        }
      });

      // Enrich tvdbids with MAL data
      const enrichedSeries = tvdbids.map((series: any) => {
        const malAnime = filteredAnime.find((a: any) => a.title === series.title);
        return {
          ...series,
          malId: malAnime?.malId,
          score: malAnime?.score,
          status: malAnime?.status,
          seriesType: 'standard', // TODO: Get from TVDB if available
        };
      });

      // Use enhanced sync with all advanced features
      const results = await addAnimeToSonarrEnhanced(
        enrichedSeries,
        animeDataMap,
        rootFolder[0]['path'],
        {
          searchForMissingEpisodes: userPreferences?.searchForMissingEpisodes ?? false,
          enableSmartDuplicateDetection: userPreferences?.enableSmartDuplicateDetection ?? true,
          fuzzyMatchThreshold: userPreferences?.fuzzyMatchThreshold ?? 85,
          conflictResolution: (userPreferences?.conflictResolution as any) ?? 'skip',
          scoreBasedMonitoringEnabled: userPreferences?.scoreBasedMonitoringEnabled ?? false,
          scoreHighThreshold: userPreferences?.scoreHighThreshold ?? 8,
          scoreMedThreshold: userPreferences?.scoreMedThreshold ?? 6,
          monitorOnlyCurrentSeason: userPreferences?.monitorOnlyCurrentSeason ?? false,
          ignoreCompletedSeries: userPreferences?.ignoreCompletedSeries ?? false,
          prioritizeAiring: userPreferences?.prioritizeAiring ?? true,
          skipOVAs: userPreferences?.skipOVAs ?? false,
          skipSpecials: userPreferences?.skipSpecials ?? false,
          skipMovies: userPreferences?.skipMovies ?? false,
          onlyMainSeries: userPreferences?.onlyMainSeries ?? false,
        }
      );

      // Add entries for anime that couldn't be found on TVDB
      const foundTitles = new Set(tvdbids.map((t: any) => t.title));
      const notFoundOnTvdb = uniqueToMal.filter((title: string) => !foundTitles.has(title));

      notFoundOnTvdb.forEach((title: string) => {
        results.push({
          title: title,
          success: false,
          reason: 'Could not find on TVDB',
        });
      });

      // Feature 7: Log sync history (if enabled)
      if (userPreferences?.keepSyncHistory) {
        try {
          const addedAnime: SyncChange[] = results
            .filter((r) => r.success && r.sonarrId)
            .map((r) => ({
              malId: enrichedSeries.find((s: any) => s.title === r.title)?.malId || 0,
              title: r.title,
              sonarrId: r.sonarrId,
            }));

          await logSyncHistory({
            username,
            addedAnime,
            removedAnime: [], // TODO: Track removed anime
            updatedAnime: [], // TODO: Track updated anime
            success: true,
          });
        } catch (error) {
          console.error('[Sync] Failed to log sync history:', error);
          // Don't fail the sync if history logging fails
        }
      }

      // Track sync errors in database
      try {
        const failedSyncs = results.filter((r) => !r.success);

        for (const failed of failedSyncs) {
          const anime = filteredAnime.find((a: any) => a.title === failed.title);
          if (anime?.malId) {
            // Upsert sync error - increment attempt count if already exists
            await prisma.syncError.upsert({
              where: {
                username_malId: {
                  username,
                  malId: anime.malId,
                },
              },
              create: {
                username,
                malId: anime.malId,
                title: failed.title,
                reason: failed.reason || 'Unknown error',
                attemptCount: 1,
              },
              update: {
                reason: failed.reason || 'Unknown error',
                lastAttempt: new Date(),
                attemptCount: {
                  increment: 1,
                },
              },
            });
          }
        }

        // Mark successfully synced anime as resolved
        const successfulSyncs = results.filter((r) => r.success);
        for (const success of successfulSyncs) {
          const anime = filteredAnime.find((a: any) => a.title === success.title);
          if (anime?.malId) {
            await prisma.syncError.updateMany({
              where: {
                username,
                malId: anime.malId,
                resolved: false,
              },
              data: {
                resolved: true,
              },
            });
          }
        }
      } catch (error) {
        console.error('[Sync] Failed to track sync errors:', error);
        // Don't fail the sync if error tracking fails
      }

      // Feature 2: Execute batch actions after sync (if enabled)
      const addedSonarrIds = results
        .filter((r) => r.success && r.sonarrId)
        .map((r) => r.sonarrId!);

      if (addedSonarrIds.length > 0) {
        try {
          await executeAfterSyncActions(
            {
              afterSyncRefreshMetadata: userPreferences?.afterSyncRefreshMetadata ?? false,
              afterSyncSearchMissing: userPreferences?.afterSyncSearchMissing ?? false,
              afterSyncBackupDatabase: userPreferences?.afterSyncBackupDatabase ?? false,
            },
            addedSonarrIds,
            username,
            process.env.SONARR_API_KEY!,
            process.env.SONARR_URL!
          );
        } catch (error) {
          console.error('[Sync] Failed to execute batch actions:', error);
          // Don't fail the sync if batch actions fail
        }
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            results: results,
            diff: uniqueToMal,
            lists: { mal: animeTitles, sonarr: sonarrSeries },
          },
        },
        { status: 200 }
      );
    }
  }

  if (uniqueToSonarr.length > 0) {
    return NextResponse.json(
      { message: 'Your Sonarr is out of sync, please resolve manually' },
      { status: 401 }
    );
  }

  if (uniqueToMal.length === 0 && uniqueToSonarr.length === 0) {
    return NextResponse.json({ message: 'Everything is already synced!' }, { status: 200 });
  }

  if (diff === 'true') {
    return NextResponse.json({
      diff: uniqueToMal,
      lists: { mal: animeTitles, sonarr: sonarrSeries },
    });
  }

  const tvdbidApiKey = process.env.TVDBID_API_KEY;

  if (!tvdbidApiKey) {
    return NextResponse.json({ message: 'TVDB API key is missing.' }, { status: 500 });
  }

  const tvdbids = await getTvdbIds(uniqueToMal, tvdbidApiKey);
  const rootFolder = await getSonarrRootFolder();

  // Check if root folder exists
  if (!rootFolder || rootFolder.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          'No root folders configured in Sonarr. Please add a root folder in Sonarr Settings → Media Management → Root Folders.',
      },
      { status: 400 }
    );
  }

  // Build anime data map for enhanced sync features
  const animeDataMap = new Map<number, Anime>();
  filteredAnime.forEach((anime: any) => {
    if (anime.malId) {
      animeDataMap.set(anime.malId, anime as Anime);
    }
  });

  // Enrich tvdbids with MAL data
  const enrichedSeries = tvdbids.map((series: any) => {
    const malAnime = filteredAnime.find((a: any) => a.title === series.title);
    return {
      ...series,
      malId: malAnime?.malId,
      score: malAnime?.score,
      status: malAnime?.status,
      seriesType: 'standard',
    };
  });

  // Use enhanced sync with all advanced features
  const results = await addAnimeToSonarrEnhanced(
    enrichedSeries,
    animeDataMap,
    rootFolder[0]['path'],
    {
      searchForMissingEpisodes: userPreferences?.searchForMissingEpisodes ?? false,
      enableSmartDuplicateDetection: userPreferences?.enableSmartDuplicateDetection ?? true,
      fuzzyMatchThreshold: userPreferences?.fuzzyMatchThreshold ?? 85,
      conflictResolution: (userPreferences?.conflictResolution as any) ?? 'skip',
      scoreBasedMonitoringEnabled: userPreferences?.scoreBasedMonitoringEnabled ?? false,
      scoreHighThreshold: userPreferences?.scoreHighThreshold ?? 8,
      scoreMedThreshold: userPreferences?.scoreMedThreshold ?? 6,
      monitorOnlyCurrentSeason: userPreferences?.monitorOnlyCurrentSeason ?? false,
      ignoreCompletedSeries: userPreferences?.ignoreCompletedSeries ?? false,
      prioritizeAiring: userPreferences?.prioritizeAiring ?? true,
      skipOVAs: userPreferences?.skipOVAs ?? false,
      skipSpecials: userPreferences?.skipSpecials ?? false,
      skipMovies: userPreferences?.skipMovies ?? false,
      onlyMainSeries: userPreferences?.onlyMainSeries ?? false,
    }
  );

  // Add entries for anime that couldn't be found on TVDB
  const foundTitles = new Set(tvdbids.map((t: any) => t.title));
  const notFoundOnTvdb = uniqueToMal.filter((title: string) => !foundTitles.has(title));

  notFoundOnTvdb.forEach((title: string) => {
    results.push({
      title: title,
      success: false,
      reason: 'Could not find on TVDB',
    });
  });

  // Feature 7: Log sync history (if enabled)
  if (userPreferences?.keepSyncHistory) {
    try {
      const addedAnime: SyncChange[] = results
        .filter((r) => r.success && r.sonarrId)
        .map((r) => ({
          malId: enrichedSeries.find((s: any) => s.title === r.title)?.malId || 0,
          title: r.title,
          sonarrId: r.sonarrId,
        }));

      await logSyncHistory({
        username,
        addedAnime,
        removedAnime: [],
        updatedAnime: [],
        success: true,
      });
    } catch (error) {
      console.error('[Sync] Failed to log sync history:', error);
    }
  }

  // Feature 2: Execute batch actions after sync (if enabled)
  const addedSonarrIds = results
    .filter((r) => r.success && r.sonarrId)
    .map((r) => r.sonarrId!);

  if (addedSonarrIds.length > 0) {
    try {
      await executeAfterSyncActions(
        {
          afterSyncRefreshMetadata: userPreferences?.afterSyncRefreshMetadata ?? false,
          afterSyncSearchMissing: userPreferences?.afterSyncSearchMissing ?? false,
          afterSyncBackupDatabase: userPreferences?.afterSyncBackupDatabase ?? false,
        },
        addedSonarrIds,
        username,
        process.env.SONARR_API_KEY!,
        process.env.SONARR_URL!
      );
    } catch (error) {
      console.error('[Sync] Failed to execute batch actions:', error);
    }
  }

  return NextResponse.json(
    {
      success: true,
      message: results,
      data: { diff: uniqueToMal, lists: { mal: animeTitles, sonarr: sonarrSeries } },
    },
    { status: 200 }
  );
}
