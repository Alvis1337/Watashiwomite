/**
 * Type definitions for Sync Settings
 */

export interface SyncPreferences {
    watching: boolean;
    completed: boolean;
    on_hold: boolean;
    dropped: boolean;
    plan_to_watch: boolean;
    searchForMissingEpisodes: boolean;

    // Feature 1: Smart Duplicate Detection
    enableSmartDuplicateDetection: boolean;
    fuzzyMatchThreshold: number;

    // Feature 2: Batch Actions After Sync
    afterSyncRefreshMetadata: boolean;
    afterSyncSearchMissing: boolean;
    afterSyncBackupDatabase: boolean;

    // Feature 3: Sync Conflict Resolution
    conflictResolution: 'mal-wins' | 'sonarr-wins' | 'ask-me' | 'skip';

    // Feature 4: Sync Preview Mode
    alwaysPreviewBeforeSync: boolean;

    // Feature 5: MAL Score-Based Auto-Monitor
    scoreBasedMonitoringEnabled: boolean;
    scoreHighThreshold: number;
    scoreMedThreshold: number;

    // Feature 6: Airing Status Intelligence
    monitorOnlyCurrentSeason: boolean;
    ignoreCompletedSeries: boolean;
    prioritizeAiring: boolean;

    // Feature 7: Sync History & Rollback
    keepSyncHistory: boolean;
    maxHistoryEntries: number;

    // Feature 8: Intelligent Episode Filtering
    skipOVAs: boolean;
    skipSpecials: boolean;
    skipMovies: boolean;
    onlyMainSeries: boolean;
}
