import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getTvdbIds } from '@/utils/utils';
import { findPotentialDuplicates } from '@/utils/syncFeatures';

/**
 * @swagger
 * /api/sync/preview:
 *   get:
 *     summary: Preview sync changes without executing
 *     description: Shows what would be added/removed/skipped if sync is executed
 *     tags:
 *       - Sync
 *     parameters:
 *       - name: username
 *         in: query
 *         required: true
 *         description: Username to preview sync for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Preview generated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Preview failed
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { message: 'Username is required' },
        { status: 400 }
      );
    }

    // Fetch user preferences
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { username },
    });

    const preferences = userPreferences || {
      syncWatching: true,
      syncCompleted: false,
      syncOnHold: false,
      syncDropped: false,
      syncPlanToWatch: true,
    };

    // Fetch user's anime list
    const userList = await prisma.animeList.findUnique({
      where: { username },
      include: {
        anime: true,
        sonarrSeries: true,
      },
    });

    if (!userList?.anime || !userList?.sonarrSeries) {
      return NextResponse.json(
        { message: "Failed to pull user's MAL list" },
        { status: 400 }
      );
    }

    // Filter anime based on preferences
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

    // Get titles
    const animeTitles = filteredAnime.map((anime: any) => anime.title);
    const sonarrSeriesMap = new Map(
      userList.sonarrSeries.map((series: any) => [series.title, series])
    );
    const sonarrTitles = Array.from(sonarrSeriesMap.keys());

    // Find differences
    const uniqueToMal = animeTitles.filter((title: string) => !sonarrTitles.includes(title));

    if (uniqueToMal.length === 0) {
      return NextResponse.json({
        success: true,
        preview: {
          willAdd: [],
          willSkip: [],
          willUpdate: [],
          summary: 'Everything is already synced!',
        },
      });
    }

    // Get TVDB IDs for preview
    const tvdbidApiKey = process.env.TVDBID_API_KEY;
    const tvdbids = await getTvdbIds(uniqueToMal, tvdbidApiKey);

    // Fetch existing Sonarr series for duplicate detection
    const sonarrUrl = `${process.env.SONARR_URL}/api/v3/series`;
    const sonarrApiKey = process.env.SONARR_API_KEY;

    let existingSeries: any[] = [];
    try {
      const response = await fetch(sonarrUrl, {
        headers: { 'X-Api-Key': sonarrApiKey! },
      });
      if (response.ok) {
        existingSeries = await response.json();
      }
    } catch (error) {
      console.error('[Preview] Failed to fetch Sonarr series:', error);
    }

    const willAdd: any[] = [];
    const willSkip: any[] = [];
    const willUpdate: any[] = [];

    // Analyze each anime
    for (const tvdbEntry of tvdbids) {
      const anime = filteredAnime.find((a: any) => a.title === tvdbEntry.title);

      // Check for duplicates if enabled
      if (userPreferences?.enableSmartDuplicateDetection) {
        const duplicates = findPotentialDuplicates(
          tvdbEntry.title,
          existingSeries,
          userPreferences.fuzzyMatchThreshold
        );

        if (duplicates.length > 0) {
          willSkip.push({
            title: tvdbEntry.title,
            reason: `Potential duplicate: "${duplicates[0].existingTitle}" (${Math.round(duplicates[0].similarity)}% similar)`,
            malScore: anime?.score,
          });
          continue;
        }
      }

      // Check if already exists by TVDB ID
      const exists = existingSeries.find(
        (s) => parseInt(s.tvdbId) === parseInt(tvdbEntry.tvdbId)
      );

      if (exists) {
        // Check for conflicts
        const malWatching = anime?.status?.toLowerCase() === 'watching';
        if (malWatching && !exists.monitored) {
          willUpdate.push({
            title: tvdbEntry.title,
            action: 'Update monitoring to match MAL',
            currentStatus: 'Not monitored in Sonarr',
            malScore: anime?.score,
          });
        } else {
          willSkip.push({
            title: tvdbEntry.title,
            reason: 'Already exists in Sonarr',
            malScore: anime?.score,
          });
        }
        continue;
      }

      // Will be added
      let monitoringNote = 'Standard monitoring';
      if (userPreferences?.scoreBasedMonitoringEnabled && anime?.score) {
        if (anime.score >= (userPreferences.scoreHighThreshold || 8)) {
          monitoringNote = `High-rated (${anime.score}/10) - Monitor all episodes`;
        } else if (anime.score >= (userPreferences.scoreMedThreshold || 6)) {
          monitoringNote = `Medium-rated (${anime.score}/10) - Monitor new episodes only`;
        } else {
          monitoringNote = `Low-rated (${anime.score}/10) - Add but don't monitor`;
        }
      }

      willAdd.push({
        title: tvdbEntry.title,
        tvdbId: tvdbEntry.tvdbId,
        malScore: anime?.score,
        monitoring: monitoringNote,
      });
    }

    // Add not found entries
    const foundTitles = new Set(tvdbids.map((t: any) => t.title));
    const notFoundOnTvdb = uniqueToMal.filter((title: string) => !foundTitles.has(title));

    notFoundOnTvdb.forEach((title: string) => {
      willSkip.push({
        title,
        reason: 'Could not find on TVDB',
      });
    });

    const summary = `Will add ${willAdd.length} anime, skip ${willSkip.length}, update ${willUpdate.length}`;

    return NextResponse.json({
      success: true,
      preview: {
        willAdd,
        willSkip,
        willUpdate,
        summary,
        batchActions: {
          refreshMetadata: userPreferences?.afterSyncRefreshMetadata ?? false,
          searchMissing: userPreferences?.afterSyncSearchMissing ?? false,
          backupDatabase: userPreferences?.afterSyncBackupDatabase ?? false,
        },
      },
    });
  } catch (error) {
    console.error('[Preview] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Preview failed',
      },
      { status: 500 }
    );
  }
}
