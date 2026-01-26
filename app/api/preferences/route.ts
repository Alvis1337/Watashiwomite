import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

/**
 * @swagger
 * /api/preferences:
 *   get:
 *     summary: Get user sync preferences
 *     description: Retrieves the user's MAL list sync preferences from the database
 *     tags:
 *       - Preferences
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         description: Username to fetch preferences for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully
 *       400:
 *         description: Username is required
 *       500:
 *         description: Failed to fetch preferences
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ message: 'Username is required' }, { status: 400 });
    }

    // Get or create preferences with defaults
    const preferences = await prisma.userPreferences.upsert({
      where: { username },
      update: {},
      create: {
        username,
        syncWatching: true,
        syncCompleted: false,
        syncOnHold: false,
        syncDropped: false,
        syncPlanToWatch: true,
        searchForMissingEpisodes: false,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: {
        watching: preferences.syncWatching,
        completed: preferences.syncCompleted,
        on_hold: preferences.syncOnHold,
        dropped: preferences.syncDropped,
        plan_to_watch: preferences.syncPlanToWatch,
        searchForMissingEpisodes: preferences.searchForMissingEpisodes,

        // Feature 1
        enableSmartDuplicateDetection: preferences.enableSmartDuplicateDetection,
        fuzzyMatchThreshold: preferences.fuzzyMatchThreshold,

        // Feature 2
        afterSyncRefreshMetadata: preferences.afterSyncRefreshMetadata,
        afterSyncSearchMissing: preferences.afterSyncSearchMissing,
        afterSyncBackupDatabase: preferences.afterSyncBackupDatabase,

        // Feature 3
        conflictResolution: preferences.conflictResolution,

        // Feature 4
        alwaysPreviewBeforeSync: preferences.alwaysPreviewBeforeSync,

        // Feature 5
        scoreBasedMonitoringEnabled: preferences.scoreBasedMonitoringEnabled,
        scoreHighThreshold: preferences.scoreHighThreshold,
        scoreMedThreshold: preferences.scoreMedThreshold,

        // Feature 6
        monitorOnlyCurrentSeason: preferences.monitorOnlyCurrentSeason,
        ignoreCompletedSeries: preferences.ignoreCompletedSeries,
        prioritizeAiring: preferences.prioritizeAiring,

        // Feature 7
        keepSyncHistory: preferences.keepSyncHistory,
        maxHistoryEntries: preferences.maxHistoryEntries,

        // Feature 8
        skipOVAs: preferences.skipOVAs,
        skipSpecials: preferences.skipSpecials,
        skipMovies: preferences.skipMovies,
        onlyMainSeries: preferences.onlyMainSeries,
      },
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch preferences',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/preferences:
 *   post:
 *     summary: Update user sync preferences
 *     description: Saves the user's MAL list sync preferences to the database
 *     tags:
 *       - Preferences
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               preferences:
 *                 type: object
 *                 properties:
 *                   watching:
 *                     type: boolean
 *                   completed:
 *                     type: boolean
 *                   on_hold:
 *                     type: boolean
 *                   dropped:
 *                     type: boolean
 *                   plan_to_watch:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Preferences saved successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Failed to save preferences
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, preferences } = body;

    if (!username) {
      return NextResponse.json({ message: 'Username is required' }, { status: 400 });
    }

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ message: 'Preferences object is required' }, { status: 400 });
    }

    // Update or create preferences
    const saved = await prisma.userPreferences.upsert({
      where: { username },
      update: {
        syncWatching: preferences.watching ?? true,
        syncCompleted: preferences.completed ?? false,
        syncOnHold: preferences.on_hold ?? false,
        syncDropped: preferences.dropped ?? false,
        syncPlanToWatch: preferences.plan_to_watch ?? true,
        searchForMissingEpisodes: preferences.searchForMissingEpisodes ?? false,

        // Feature 1
        enableSmartDuplicateDetection: preferences.enableSmartDuplicateDetection ?? true,
        fuzzyMatchThreshold: preferences.fuzzyMatchThreshold ?? 85,

        // Feature 2
        afterSyncRefreshMetadata: preferences.afterSyncRefreshMetadata ?? false,
        afterSyncSearchMissing: preferences.afterSyncSearchMissing ?? false,
        afterSyncBackupDatabase: preferences.afterSyncBackupDatabase ?? false,

        // Feature 3
        conflictResolution: preferences.conflictResolution ?? 'skip',

        // Feature 4
        alwaysPreviewBeforeSync: preferences.alwaysPreviewBeforeSync ?? false,

        // Feature 5
        scoreBasedMonitoringEnabled: preferences.scoreBasedMonitoringEnabled ?? false,
        scoreHighThreshold: preferences.scoreHighThreshold ?? 8,
        scoreMedThreshold: preferences.scoreMedThreshold ?? 6,

        // Feature 6
        monitorOnlyCurrentSeason: preferences.monitorOnlyCurrentSeason ?? false,
        ignoreCompletedSeries: preferences.ignoreCompletedSeries ?? false,
        prioritizeAiring: preferences.prioritizeAiring ?? true,

        // Feature 7
        keepSyncHistory: preferences.keepSyncHistory ?? true,
        maxHistoryEntries: preferences.maxHistoryEntries ?? 10,

        // Feature 8
        skipOVAs: preferences.skipOVAs ?? false,
        skipSpecials: preferences.skipSpecials ?? false,
        skipMovies: preferences.skipMovies ?? false,
        onlyMainSeries: preferences.onlyMainSeries ?? false,
      },
      create: {
        username,
        syncWatching: preferences.watching ?? true,
        syncCompleted: preferences.completed ?? false,
        syncOnHold: preferences.on_hold ?? false,
        syncDropped: preferences.dropped ?? false,
        syncPlanToWatch: preferences.plan_to_watch ?? true,
        searchForMissingEpisodes: preferences.searchForMissingEpisodes ?? false,

        // Feature 1
        enableSmartDuplicateDetection: preferences.enableSmartDuplicateDetection ?? true,
        fuzzyMatchThreshold: preferences.fuzzyMatchThreshold ?? 85,

        // Feature 2
        afterSyncRefreshMetadata: preferences.afterSyncRefreshMetadata ?? false,
        afterSyncSearchMissing: preferences.afterSyncSearchMissing ?? false,
        afterSyncBackupDatabase: preferences.afterSyncBackupDatabase ?? false,

        // Feature 3
        conflictResolution: preferences.conflictResolution ?? 'skip',

        // Feature 4
        alwaysPreviewBeforeSync: preferences.alwaysPreviewBeforeSync ?? false,

        // Feature 5
        scoreBasedMonitoringEnabled: preferences.scoreBasedMonitoringEnabled ?? false,
        scoreHighThreshold: preferences.scoreHighThreshold ?? 8,
        scoreMedThreshold: preferences.scoreMedThreshold ?? 6,

        // Feature 6
        monitorOnlyCurrentSeason: preferences.monitorOnlyCurrentSeason ?? false,
        ignoreCompletedSeries: preferences.ignoreCompletedSeries ?? false,
        prioritizeAiring: preferences.prioritizeAiring ?? true,

        // Feature 7
        keepSyncHistory: preferences.keepSyncHistory ?? true,
        maxHistoryEntries: preferences.maxHistoryEntries ?? 10,

        // Feature 8
        skipOVAs: preferences.skipOVAs ?? false,
        skipSpecials: preferences.skipSpecials ?? false,
        skipMovies: preferences.skipMovies ?? false,
        onlyMainSeries: preferences.onlyMainSeries ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Preferences saved successfully',
      preferences: {
        watching: saved.syncWatching,
        completed: saved.syncCompleted,
        on_hold: saved.syncOnHold,
        dropped: saved.syncDropped,
        plan_to_watch: saved.syncPlanToWatch,
        searchForMissingEpisodes: saved.searchForMissingEpisodes,

        // Feature 1
        enableSmartDuplicateDetection: saved.enableSmartDuplicateDetection,
        fuzzyMatchThreshold: saved.fuzzyMatchThreshold,

        // Feature 2
        afterSyncRefreshMetadata: saved.afterSyncRefreshMetadata,
        afterSyncSearchMissing: saved.afterSyncSearchMissing,
        afterSyncBackupDatabase: saved.afterSyncBackupDatabase,

        // Feature 3
        conflictResolution: saved.conflictResolution,

        // Feature 4
        alwaysPreviewBeforeSync: saved.alwaysPreviewBeforeSync,

        // Feature 5
        scoreBasedMonitoringEnabled: saved.scoreBasedMonitoringEnabled,
        scoreHighThreshold: saved.scoreHighThreshold,
        scoreMedThreshold: saved.scoreMedThreshold,

        // Feature 6
        monitorOnlyCurrentSeason: saved.monitorOnlyCurrentSeason,
        ignoreCompletedSeries: saved.ignoreCompletedSeries,
        prioritizeAiring: saved.prioritizeAiring,

        // Feature 7
        keepSyncHistory: saved.keepSyncHistory,
        maxHistoryEntries: saved.maxHistoryEntries,

        // Feature 8
        skipOVAs: saved.skipOVAs,
        skipSpecials: saved.skipSpecials,
        skipMovies: saved.skipMovies,
        onlyMainSeries: saved.onlyMainSeries,
      },
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json(
      {
        message: 'Failed to save preferences',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
