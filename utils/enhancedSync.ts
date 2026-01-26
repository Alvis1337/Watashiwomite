/**
 * Enhanced Anime to Sonarr Sync with Advanced Features
 * Integrates all 8 advanced sync features
 */

import { Anime } from '../types/interfaces';
import {
  findPotentialDuplicates,
  calculateMonitoringFromScore,
  shouldSkipBasedOnAiringStatus,
  applyAiringStatusLogic,
  shouldSkipSeriesType,
  detectConflict,
  resolveConflict,
  ConflictResolutionStrategy,
} from './syncFeatures';

export interface AnimeSeries {
  title: string;
  tvdbId: string;
  malId?: number;
  score?: number | null;
  status?: string;
  seriesType?: string;
}

export interface AddResult {
  title: string;
  success: boolean;
  reason?: string;
  sonarrId?: number;
  duplicate?: boolean;
  conflictSkipped?: boolean;
}

export interface SyncPreferences {
  searchForMissingEpisodes: boolean;
  enableSmartDuplicateDetection: boolean;
  fuzzyMatchThreshold: number;
  conflictResolution: ConflictResolutionStrategy;
  scoreBasedMonitoringEnabled: boolean;
  scoreHighThreshold: number;
  scoreMedThreshold: number;
  monitorOnlyCurrentSeason: boolean;
  ignoreCompletedSeries: boolean;
  prioritizeAiring: boolean;
  skipOVAs: boolean;
  skipSpecials: boolean;
  skipMovies: boolean;
  onlyMainSeries: boolean;
}

/**
 * Enhanced addAnimeToSonarr with all advanced features integrated
 */
export async function addAnimeToSonarrEnhanced(
  animeSeries: AnimeSeries[],
  animeData: Map<number, Anime>, // MAL anime data with scores, status, etc.
  rootFolder: string,
  preferences: SyncPreferences
): Promise<AddResult[]> {
  const sonarrUrl = `${process.env.SONARR_URL}/api/v3/series`;
  const sonarrApiKey = process.env.SONARR_API_KEY;

  if (!sonarrApiKey) {
    throw new Error('SONARR_API_KEY is not configured');
  }

  // Fetch existing series from Sonarr
  let existingSeries: any[] = [];
  try {
    const existingResponse = await fetch(sonarrUrl, {
      headers: { 'X-Api-Key': sonarrApiKey },
    });
    if (existingResponse.ok) {
      existingSeries = await existingResponse.json();
    }
  } catch (error) {
    console.error('[EnhancedSync] Failed to fetch existing series:', error);
  }

  const results: AddResult[] = [];
  const addedSonarrIds: number[] = [];

  for (const series of animeSeries) {
    const tvdbIdNum = parseInt(series.tvdbId);
    const anime = series.malId ? animeData.get(series.malId) : undefined;

    // Feature 8: Episode Type Filtering
    if (series.seriesType && shouldSkipSeriesType(series.seriesType, {
      skipOVAs: preferences.skipOVAs,
      skipSpecials: preferences.skipSpecials,
      skipMovies: preferences.skipMovies,
      onlyMainSeries: preferences.onlyMainSeries,
    })) {
      results.push({
        title: series.title,
        success: false,
        reason: `Skipped: ${series.seriesType} (filtered by preferences)`,
      });
      continue;
    }

    // Feature 6: Airing Status Intelligence - Skip completed series if configured
    if (anime && shouldSkipBasedOnAiringStatus(anime, preferences.ignoreCompletedSeries)) {
      results.push({
        title: series.title,
        success: false,
        reason: 'Skipped: Completed series (filtered by preferences)',
      });
      continue;
    }

    // Check if already exists by TVDB ID
    const existingByTvdb = existingSeries.find((s) => parseInt(s.tvdbId) === tvdbIdNum);

    if (existingByTvdb) {
      // Feature 3: Conflict Resolution
      if (anime) {
        const conflict = detectConflict(anime, existingByTvdb);
        if (conflict) {
          const action = resolveConflict(preferences.conflictResolution, conflict);

          if (action === 'update-sonarr') {
            // Update the existing series to match MAL
            try {
              await fetch(`${sonarrUrl}/${existingByTvdb.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Api-Key': sonarrApiKey,
                },
                body: JSON.stringify({
                  ...existingByTvdb,
                  monitored: true, // MAL says watching, so monitor it
                }),
              });
              results.push({
                title: series.title,
                success: true,
                reason: 'Updated to match MAL status',
                sonarrId: existingByTvdb.id,
              });
            } catch (error) {
              results.push({
                title: series.title,
                success: false,
                reason: 'Failed to update conflict',
              });
            }
            continue;
          } else if (action === 'ask-user') {
            // TODO: Store conflict for user to resolve later
            results.push({
              title: series.title,
              success: false,
              reason: 'Conflict requires user decision',
              conflictSkipped: true,
            });
            continue;
          }
        }
      }

      results.push({
        title: series.title,
        success: false,
        reason: 'Already exists in Sonarr',
      });
      continue;
    }

    // Feature 1: Smart Duplicate Detection
    if (preferences.enableSmartDuplicateDetection) {
      const duplicates = findPotentialDuplicates(
        series.title,
        existingSeries,
        preferences.fuzzyMatchThreshold
      );

      if (duplicates.length > 0) {
        const bestMatch = duplicates[0];
        results.push({
          title: series.title,
          success: false,
          reason: `Potential duplicate: "${bestMatch.existingTitle}" (${Math.round(bestMatch.similarity)}% similar)`,
          duplicate: true,
        });
        continue;
      }
    }

    // Feature 5: Score-Based Monitoring
    const monitoringConfig = calculateMonitoringFromScore(
      anime?.score ?? series.score ?? null,
      preferences.scoreBasedMonitoringEnabled,
      preferences.scoreHighThreshold,
      preferences.scoreMedThreshold,
      preferences.searchForMissingEpisodes
    );

    // Feature 6: Airing Status Logic
    let airingLogic: { monitorNewItems: string; priority?: number } = {
      monitorNewItems: 'all',
      priority: undefined
    };
    if (anime) {
      const result = applyAiringStatusLogic(
        anime,
        preferences.monitorOnlyCurrentSeason,
        preferences.prioritizeAiring
      );
      airingLogic = {
        monitorNewItems: result.monitorNewItems,
        priority: result.priority
      };
    }

    // Build Sonarr request body with all features applied
    const sonarrRequestBody = {
      tvdbId: tvdbIdNum,
      title: series.title,
      qualityProfileId: 1,
      seriesType: 'standard',
      seasonFolder: true,
      monitored: monitoringConfig.monitored,
      monitorNewItems: airingLogic.monitorNewItems || monitoringConfig.monitorNewItems,
      rootFolderPath: rootFolder,
      addOptions: {
        searchForMissingEpisodes: monitoringConfig.searchForMissingEpisodes,
      },
      tags: airingLogic.priority ? ['priority'] : [],
    };

    // Add to Sonarr
    try {
      const response = await fetch(sonarrUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': sonarrApiKey,
        },
        body: JSON.stringify(sonarrRequestBody),
      });

      if (response.ok) {
        const addedSeries = await response.json();
        addedSonarrIds.push(addedSeries.id);
        results.push({
          title: series.title,
          success: true,
          sonarrId: addedSeries.id,
        });
      } else {
        const errorText = await response.text();
        console.error(`[EnhancedSync] Failed to add ${series.title}:`, errorText);
        results.push({
          title: series.title,
          success: false,
          reason: `API error: ${response.status}`,
        });
      }
    } catch (error) {
      console.error(`[EnhancedSync] Error adding ${series.title}:`, error);
      results.push({
        title: series.title,
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
