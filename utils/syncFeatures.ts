/**
 * Advanced Sync Features Utilities
 * Modular functions for each advanced sync feature
 */

import { Anime } from '../types/interfaces';

/**
 * Feature 1: Smart Duplicate Detection
 * Uses Levenshtein distance to detect similar titles
 */
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export function calculateSimilarityPercentage(str1: string, str2: string): number {
  const distance = calculateLevenshteinDistance(
    str1.toLowerCase(),
    str2.toLowerCase()
  );
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return ((maxLength - distance) / maxLength) * 100;
}

export interface DuplicateMatch {
  existingTitle: string;
  existingId: number;
  newTitle: string;
  similarity: number;
}

export function findPotentialDuplicates(
  newTitle: string,
  existingSeries: Array<{ id: number; title: string; alternateTitles?: any }>,
  threshold: number
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  for (const series of existingSeries) {
    // Check main title
    const mainSimilarity = calculateSimilarityPercentage(newTitle, series.title);
    if (mainSimilarity >= threshold) {
      matches.push({
        existingTitle: series.title,
        existingId: series.id,
        newTitle,
        similarity: mainSimilarity,
      });
      continue;
    }

    // Check alternate titles if available
    if (series.alternateTitles && Array.isArray(series.alternateTitles)) {
      for (const altTitle of series.alternateTitles) {
        const altTitleStr = typeof altTitle === 'string' ? altTitle : altTitle.title;
        if (altTitleStr) {
          const altSimilarity = calculateSimilarityPercentage(newTitle, altTitleStr);
          if (altSimilarity >= threshold) {
            matches.push({
              existingTitle: `${series.title} (alt: ${altTitleStr})`,
              existingId: series.id,
              newTitle,
              similarity: altSimilarity,
            });
            break;
          }
        }
      }
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Feature 5: MAL Score-Based Auto-Monitor
 */
export interface MonitoringConfig {
  monitored: boolean;
  monitorNewItems: string;
  searchForMissingEpisodes: boolean;
}

export function calculateMonitoringFromScore(
  score: number | null,
  scoreBasedMonitoringEnabled: boolean,
  scoreHighThreshold: number,
  scoreMedThreshold: number,
  defaultSearchForMissingEpisodes: boolean
): MonitoringConfig {
  if (!scoreBasedMonitoringEnabled || score === null) {
    return {
      monitored: true,
      monitorNewItems: 'all',
      searchForMissingEpisodes: defaultSearchForMissingEpisodes,
    };
  }

  if (score >= scoreHighThreshold) {
    // High-rated: Monitor everything, auto-search
    return {
      monitored: true,
      monitorNewItems: 'all',
      searchForMissingEpisodes: true,
    };
  } else if (score >= scoreMedThreshold) {
    // Medium-rated: Monitor new episodes only, no auto-search
    return {
      monitored: true,
      monitorNewItems: 'new',
      searchForMissingEpisodes: false,
    };
  } else {
    // Low-rated: Add but don't monitor
    return {
      monitored: false,
      monitorNewItems: 'none',
      searchForMissingEpisodes: false,
    };
  }
}

/**
 * Feature 6: Airing Status Intelligence
 */
export function shouldSkipBasedOnAiringStatus(
  anime: Anime,
  ignoreCompletedSeries: boolean
): boolean {
  if (!ignoreCompletedSeries) return false;

  const status = anime.status.toLowerCase();
  return status === 'completed' || status === 'finished_airing';
}

export function applyAiringStatusLogic(
  anime: Anime,
  monitorOnlyCurrentSeason: boolean,
  prioritizeAiring: boolean
): { monitorNewItems: string; priority?: number } {
  const isAiring = anime.status.toLowerCase() === 'watching' ||
                   anime.status.toLowerCase() === 'currently_airing';

  return {
    monitorNewItems: monitorOnlyCurrentSeason && isAiring ? 'new' : 'all',
    priority: prioritizeAiring && isAiring ? 1 : undefined,
  };
}

/**
 * Feature 8: Intelligent Episode Filtering
 */
export interface EpisodeFilterConfig {
  skipOVAs: boolean;
  skipSpecials: boolean;
  skipMovies: boolean;
  onlyMainSeries: boolean;
}

export function shouldSkipSeriesType(
  seriesType: string,
  filterConfig: EpisodeFilterConfig
): boolean {
  const type = seriesType.toLowerCase();

  if (filterConfig.onlyMainSeries && type !== 'standard' && type !== 'anime') {
    return true;
  }

  if (filterConfig.skipOVAs && (type === 'ova' || type.includes('ova'))) {
    return true;
  }

  if (filterConfig.skipSpecials && type === 'special') {
    return true;
  }

  if (filterConfig.skipMovies && type === 'movie') {
    return true;
  }

  return false;
}

/**
 * Feature 3: Sync Conflict Resolution
 */
export interface ConflictInfo {
  title: string;
  malId: number;
  sonarrId: number;
  malStatus: string;
  sonarrMonitored: boolean;
  conflictType: 'monitoring' | 'settings';
}

export function detectConflict(
  anime: Anime,
  existingSonarrSeries: any
): ConflictInfo | null {
  if (!existingSonarrSeries) return null;

  // Simple conflict detection: MAL says watching but Sonarr not monitored
  const malWatching = anime.status.toLowerCase() === 'watching';
  const sonarrNotMonitored = !existingSonarrSeries.monitored;

  if (malWatching && sonarrNotMonitored) {
    return {
      title: anime.title,
      malId: anime.malId,
      sonarrId: existingSonarrSeries.id,
      malStatus: anime.status,
      sonarrMonitored: existingSonarrSeries.monitored,
      conflictType: 'monitoring',
    };
  }

  return null;
}

export type ConflictResolutionStrategy = 'mal-wins' | 'sonarr-wins' | 'ask-me' | 'skip';

export function resolveConflict(
  strategy: ConflictResolutionStrategy,
  conflict: ConflictInfo
): 'update-sonarr' | 'skip' | 'ask-user' {
  switch (strategy) {
    case 'mal-wins':
      return 'update-sonarr';
    case 'sonarr-wins':
      return 'skip';
    case 'ask-me':
      return 'ask-user';
    case 'skip':
    default:
      return 'skip';
  }
}
