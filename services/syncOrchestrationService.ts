/**
 * Sync Orchestration Service
 * Main service for orchestrating the sync process
 */

import { getTvdbIds, getSonarrRootFolder } from '@/utils/utils';
import { addAnimeToSonarrEnhanced } from '@/utils/enhancedSync';
import { logSyncHistory, SyncChange } from '@/utils/syncHistory';
import { executeAfterSyncActions } from '@/utils/batchActions';
import type { Anime } from '@/types/interfaces';
import type { SyncPreferences } from './preferencesService';

export interface SyncResult {
  title: string;
  success: boolean;
  reason?: string;
  sonarrId?: number;
}

/**
 * Build anime data map for enhanced sync features
 */
function buildAnimeDataMap(filteredAnime: any[]): Map<number, Anime> {
  const animeDataMap = new Map<number, Anime>();
  filteredAnime.forEach((anime: any) => {
    if (anime.malId) {
      animeDataMap.set(anime.malId, anime as Anime);
    }
  });
  return animeDataMap;
}

/**
 * Enrich TVDB series with MAL metadata
 */
function enrichSeriesWithMalData(tvdbids: any[], filteredAnime: any[]): any[] {
  return tvdbids.map((series: any) => {
    const malAnime = filteredAnime.find((a: any) => a.title === series.title);
    return {
      ...series,
      malId: malAnime?.malId,
      score: malAnime?.score,
      status: malAnime?.status,
      seriesType: 'standard',
    };
  });
}

/**
 * Add not-found entries to results
 */
function addNotFoundEntries(results: SyncResult[], uniqueToMal: string[], tvdbids: any[]): void {
  const foundTitles = new Set(tvdbids.map((t: any) => t.title));
  const notFoundOnTvdb = uniqueToMal.filter((title: string) => !foundTitles.has(title));

  notFoundOnTvdb.forEach((title: string) => {
    results.push({
      title: title,
      success: false,
      reason: 'Could not find on TVDB',
    });
  });
}

/**
 * Log sync history if enabled
 */
async function logSyncIfEnabled(
  preferences: SyncPreferences,
  username: string,
  results: SyncResult[],
  enrichedSeries: any[]
): Promise<void> {
  if (!preferences.keepSyncHistory) return;

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
    // Don't fail the sync if history logging fails
  }
}

/**
 * Execute batch actions if enabled
 */
async function executeBatchActionsIfEnabled(
  preferences: SyncPreferences,
  results: SyncResult[],
  username: string
): Promise<void> {
  const addedSonarrIds = results
    .filter((r) => r.success && r.sonarrId)
    .map((r) => r.sonarrId!);

  if (addedSonarrIds.length === 0) return;

  try {
    await executeAfterSyncActions(
      {
        afterSyncRefreshMetadata: preferences.afterSyncRefreshMetadata ?? false,
        afterSyncSearchMissing: preferences.afterSyncSearchMissing ?? false,
        afterSyncBackupDatabase: preferences.afterSyncBackupDatabase ?? false,
      },
      addedSonarrIds,
      username,
      settings.sonarrApiKey,
      settings.sonarrUrl
    );
  } catch (error) {
    console.error('[Sync] Failed to execute batch actions:', error);
    // Don't fail the sync if batch actions fail
  }
}

/**
 * Perform the complete sync operation
 */
export async function performSync(
  uniqueToMal: string[],
  filteredAnime: any[],
  preferences: SyncPreferences,
  username: string
): Promise<SyncResult[]> {
  const settings = await getSettings();
  const tvdbidApiKey = settings.tvdbApiKey;

  if (!tvdbidApiKey) {
    throw new Error('TVDB API key is not configured');
  }

  // Get TVDB IDs
  const tvdbids = await getTvdbIds(uniqueToMal, tvdbidApiKey);
  const rootFolder = await getSonarrRootFolder();

  // Check if root folder exists
  if (!rootFolder || rootFolder.length === 0) {
    throw new Error(
      'No root folders configured in Sonarr. Please add a root folder in Sonarr Settings → Media Management → Root Folders.'
    );
  }

  // Build anime data map and enrich series
  const animeDataMap = buildAnimeDataMap(filteredAnime);
  const enrichedSeries = enrichSeriesWithMalData(tvdbids, filteredAnime);

  // Use enhanced sync with all advanced features
  const results = await addAnimeToSonarrEnhanced(
    enrichedSeries,
    animeDataMap,
    rootFolder[0]['path'],
    {
      searchForMissingEpisodes: preferences.searchForMissingEpisodes ?? false,
      enableSmartDuplicateDetection: preferences.enableSmartDuplicateDetection ?? true,
      fuzzyMatchThreshold: preferences.fuzzyMatchThreshold ?? 85,
      conflictResolution: (preferences.conflictResolution as any) ?? 'skip',
      scoreBasedMonitoringEnabled: preferences.scoreBasedMonitoringEnabled ?? false,
      scoreHighThreshold: preferences.scoreHighThreshold ?? 8,
      scoreMedThreshold: preferences.scoreMedThreshold ?? 6,
      monitorOnlyCurrentSeason: preferences.monitorOnlyCurrentSeason ?? false,
      ignoreCompletedSeries: preferences.ignoreCompletedSeries ?? false,
      prioritizeAiring: preferences.prioritizeAiring ?? true,
      skipOVAs: preferences.skipOVAs ?? false,
      skipSpecials: preferences.skipSpecials ?? false,
      skipMovies: preferences.skipMovies ?? false,
      onlyMainSeries: preferences.onlyMainSeries ?? false,
    }
  );

  // Add not-found entries
  addNotFoundEntries(results, uniqueToMal, tvdbids);

  // Log sync history if enabled
  await logSyncIfEnabled(preferences, username, results, enrichedSeries);

  // Execute batch actions if enabled
  await executeBatchActionsIfEnabled(preferences, results, username);

  return results;
}
