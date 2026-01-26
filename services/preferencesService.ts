/**
 * User Preferences Service
 * Handles loading and applying user sync preferences
 */

import prisma from '../lib/prisma';

export interface SyncPreferences {
  syncWatching: boolean;
  syncCompleted: boolean;
  syncOnHold: boolean;
  syncDropped: boolean;
  syncPlanToWatch: boolean;
  searchForMissingEpisodes?: boolean;
  enableSmartDuplicateDetection?: boolean;
  fuzzyMatchThreshold?: number;
  conflictResolution?: string;
  scoreBasedMonitoringEnabled?: boolean;
  scoreHighThreshold?: number;
  scoreMedThreshold?: number;
  monitorOnlyCurrentSeason?: boolean;
  ignoreCompletedSeries?: boolean;
  prioritizeAiring?: boolean;
  skipOVAs?: boolean;
  skipSpecials?: boolean;
  skipMovies?: boolean;
  onlyMainSeries?: boolean;
  keepSyncHistory?: boolean;
  afterSyncRefreshMetadata?: boolean;
  afterSyncSearchMissing?: boolean;
  afterSyncBackupDatabase?: boolean;
}

/**
 * Load user preferences from database with sensible defaults
 */
export async function loadUserPreferences(username: string): Promise<SyncPreferences> {
  const userPreferences = await prisma.userPreferences.findUnique({
    where: { username },
  });

  // Return preferences with defaults
  return {
    syncWatching: userPreferences?.syncWatching ?? true,
    syncCompleted: userPreferences?.syncCompleted ?? false,
    syncOnHold: userPreferences?.syncOnHold ?? false,
    syncDropped: userPreferences?.syncDropped ?? false,
    syncPlanToWatch: userPreferences?.syncPlanToWatch ?? true,
    searchForMissingEpisodes: userPreferences?.searchForMissingEpisodes ?? false,
    enableSmartDuplicateDetection: userPreferences?.enableSmartDuplicateDetection ?? true,
    fuzzyMatchThreshold: userPreferences?.fuzzyMatchThreshold ?? 85,
    conflictResolution: userPreferences?.conflictResolution ?? 'skip',
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
    keepSyncHistory: userPreferences?.keepSyncHistory ?? false,
    afterSyncRefreshMetadata: userPreferences?.afterSyncRefreshMetadata ?? false,
    afterSyncSearchMissing: userPreferences?.afterSyncSearchMissing ?? false,
    afterSyncBackupDatabase: userPreferences?.afterSyncBackupDatabase ?? false,
  };
}

/**
 * Filter anime list based on user preferences
 */
export function filterAnimeByPreferences(animeList: any[], preferences: SyncPreferences): any[] {
  return animeList.filter((anime: any) => {
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
}

/**
 * Get anime that should NOT be synced based on preferences
 * (inverse of filterAnimeByPreferences)
 */
export function getUnsyncedAnime(animeList: any[], preferences: SyncPreferences): any[] {
  return animeList.filter((anime: any) => {
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
}
