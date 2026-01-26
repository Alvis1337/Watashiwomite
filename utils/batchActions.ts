/**
 * Batch Actions After Sync (Feature 2)
 * Functions to perform actions after sync completes
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import prisma from '../lib/prisma';

/**
 * Refresh metadata from TVDB for newly added series
 */
export async function refreshMetadataForSeries(
  sonarrSeriesIds: number[],
  sonarrApiKey: string,
  sonarrUrl: string
): Promise<{ success: boolean; count: number }> {
  if (sonarrSeriesIds.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const response = await fetch(`${sonarrUrl}/api/v3/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': sonarrApiKey,
      },
      body: JSON.stringify({
        name: 'RefreshSeries',
        seriesIds: sonarrSeriesIds,
      }),
    });

    if (response.ok) {
      return { success: true, count: sonarrSeriesIds.length };
    } else {
      console.error('[BatchActions] Failed to queue metadata refresh:', await response.text());
      return { success: false, count: 0 };
    }
  } catch (error) {
    console.error('[BatchActions] Error refreshing metadata:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Search for missing episodes for newly added series
 */
export async function searchForNewlyAddedSeries(
  sonarrSeriesIds: number[],
  sonarrApiKey: string,
  sonarrUrl: string
): Promise<{ success: boolean; count: number }> {
  if (sonarrSeriesIds.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const response = await fetch(`${sonarrUrl}/api/v3/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': sonarrApiKey,
      },
      body: JSON.stringify({
        name: 'SeriesSearch',
        seriesIds: sonarrSeriesIds,
      }),
    });

    if (response.ok) {
      return { success: true, count: sonarrSeriesIds.length };
    } else {
      console.error('[BatchActions] Failed to queue episode search:', await response.text());
      return { success: false, count: 0 };
    }
  } catch (error) {
    console.error('[BatchActions] Error searching for episodes:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Backup correlation database to JSON file
 */
export async function backupCorrelationDatabase(
  username: string
): Promise<{ success: boolean; filePath?: string }> {
  try {
    const animeList = await prisma.animeList.findUnique({
      where: { username },
      include: {
        anime: true,
        sonarrSeries: {
          select: {
            id: true,
            title: true,
            tvdbId: true,
            malId: true,
            path: true,
            monitored: true,
          },
        },
      },
    });

    if (!animeList) {
      return { success: false };
    }

    const backup = {
      username,
      backedUpAt: new Date().toISOString(),
      animeCount: animeList.anime.length,
      sonarrSeriesCount: animeList.sonarrSeries.length,
      anime: animeList.anime,
      sonarrSeries: animeList.sonarrSeries,
    };

    const backupDir = join(process.cwd(), 'backups');
    const filename = `correlation-backup-${username}-${Date.now()}.json`;
    const filePath = join(backupDir, filename);

    // Create backups directory if it doesn't exist
    try {
      const fs = require('fs');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
    } catch (error) {
      console.error('[BatchActions] Failed to create backup directory:', error);
    }

    writeFileSync(filePath, JSON.stringify(backup, null, 2));

    return { success: true, filePath };
  } catch (error) {
    console.error('[BatchActions] Error backing up database:', error);
    return { success: false };
  }
}

/**
 * Execute all enabled batch actions after sync
 */
export async function executeAfterSyncActions(
  preferences: {
    afterSyncRefreshMetadata: boolean;
    afterSyncSearchMissing: boolean;
    afterSyncBackupDatabase: boolean;
  },
  sonarrSeriesIds: number[],
  username: string,
  sonarrApiKey: string,
  sonarrUrl: string
): Promise<void> {
  const results: string[] = [];

  if (preferences.afterSyncRefreshMetadata) {
    const result = await refreshMetadataForSeries(sonarrSeriesIds, sonarrApiKey, sonarrUrl);
    if (result.success) {
      results.push(`Metadata refresh queued for ${result.count} series`);
    }
  }

  if (preferences.afterSyncSearchMissing) {
    const result = await searchForNewlyAddedSeries(sonarrSeriesIds, sonarrApiKey, sonarrUrl);
    if (result.success) {
      results.push(`Episode search queued for ${result.count} series`);
    }
  }

  if (preferences.afterSyncBackupDatabase) {
    const result = await backupCorrelationDatabase(username);
    if (result.success) {
      results.push(`Database backed up to ${result.filePath}`);
    }
  }
}
