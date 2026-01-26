/**
 * Sync History Management (Feature 7)
 * Functions for logging and rolling back sync operations
 */

import prisma from '../lib/prisma';

export interface SyncChange {
  malId: number;
  title: string;
  sonarrId?: number;
  changes?: Record<string, any>;
}

export interface SyncHistoryData {
  username: string;
  addedAnime: SyncChange[];
  removedAnime: SyncChange[];
  updatedAnime: SyncChange[];
  success: boolean;
  errorMessage?: string;
}

/**
 * Log a sync operation to history
 */
export async function logSyncHistory(data: SyncHistoryData): Promise<void> {
  try {
    const summary = `Added ${data.addedAnime.length}, Updated ${data.updatedAnime.length}, Removed ${data.removedAnime.length}`;

    await prisma.syncHistory.create({
      data: {
        username: data.username,
        addedAnime: data.addedAnime as any,
        removedAnime: data.removedAnime as any,
        updatedAnime: data.updatedAnime as any,
        summary,
        success: data.success,
        errorMessage: data.errorMessage,
      },
    });

    // Clean up old entries based on user preferences
    await cleanupOldSyncHistory(data.username);
  } catch (error) {
    console.error('[SyncHistory] Failed to log sync history:', error);
    // Don't throw - logging failure shouldn't break sync
  }
}

/**
 * Clean up old sync history entries beyond max limit
 */
export async function cleanupOldSyncHistory(username: string): Promise<void> {
  try {
    const preferences = await prisma.userPreferences.findUnique({
      where: { username },
      select: { maxHistoryEntries: true },
    });

    if (!preferences) return;

    const maxEntries = preferences.maxHistoryEntries;
    const allEntries = await prisma.syncHistory.findMany({
      where: { username },
      orderBy: { syncedAt: 'desc' },
      select: { id: true },
    });

    if (allEntries.length > maxEntries) {
      const entriesToDelete = allEntries.slice(maxEntries);
      await prisma.syncHistory.deleteMany({
        where: {
          id: {
            in: entriesToDelete.map((e) => e.id),
          },
        },
      });
    }
  } catch (error) {
    console.error('[SyncHistory] Failed to cleanup old entries:', error);
  }
}

/**
 * Get sync history for a user
 */
export async function getSyncHistory(username: string, limit: number = 10) {
  return await prisma.syncHistory.findMany({
    where: { username },
    orderBy: { syncedAt: 'desc' },
    take: limit,
  });
}

/**
 * Rollback a specific sync operation
 */
export async function rollbackSync(
  syncHistoryId: number,
  sonarrApiKey: string,
  sonarrUrl: string
): Promise<{ success: boolean; message: string }> {
  try {
    const syncHistory = await prisma.syncHistory.findUnique({
      where: { id: syncHistoryId },
    });

    if (!syncHistory) {
      return { success: false, message: 'Sync history not found' };
    }

    const addedAnime = (syncHistory.addedAnime as unknown) as SyncChange[];
    const removedAnime = (syncHistory.removedAnime as unknown) as SyncChange[];

    // Remove anime that were added in this sync
    for (const anime of addedAnime) {
      if (anime.sonarrId) {
        try {
          await fetch(`${sonarrUrl}/api/v3/series/${anime.sonarrId}`, {
            method: 'DELETE',
            headers: {
              'X-Api-Key': sonarrApiKey,
            },
          });
        } catch (error) {
          console.error(`[Rollback] Failed to remove ${anime.title}:`, error);
        }
      }
    }

    // TODO: Re-add anime that were removed (would need to store full series data)
    // This is complex as we'd need to re-fetch TVDB IDs and add back to Sonarr

    return {
      success: true,
      message: `Rolled back sync: Removed ${addedAnime.length} anime`,
    };
  } catch (error) {
    console.error('[Rollback] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Rollback failed',
    };
  }
}
