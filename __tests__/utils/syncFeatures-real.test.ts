/**
 * Real tests for utils/syncFeatures.ts
 * Tests all 8 advanced sync features
 */

import { Anime } from '@/types/interfaces';
import {
  calculateLevenshteinDistance,
  calculateSimilarityPercentage,
  findPotentialDuplicates,
  calculateMonitoringFromScore,
  shouldSkipBasedOnAiringStatus,
  applyAiringStatusLogic,
  shouldSkipSeriesType,
  detectConflict,
  resolveConflict,
  type DuplicateMatch,
  type MonitoringConfig,
  type EpisodeFilterConfig,
  type ConflictInfo,
  type ConflictResolutionStrategy,
} from '@/utils/syncFeatures';

describe('Sync Features - REAL', () => {
  describe('calculateLevenshteinDistance()', () => {
    it('should return 0 for identical strings', () => {
      expect(calculateLevenshteinDistance('test', 'test')).toBe(0);
    });

    it('should calculate distance for different strings', () => {
      expect(calculateLevenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(calculateLevenshteinDistance('', '')).toBe(0);
      expect(calculateLevenshteinDistance('test', '')).toBe(4);
      expect(calculateLevenshteinDistance('', 'test')).toBe(4);
    });

    it('should be case-sensitive', () => {
      expect(calculateLevenshteinDistance('Test', 'test')).toBe(1);
    });
  });

  describe('calculateSimilarityPercentage()', () => {
    it('should return 100 for identical strings', () => {
      expect(calculateSimilarityPercentage('test', 'test')).toBe(100);
    });

    it('should return 100 for empty strings', () => {
      expect(calculateSimilarityPercentage('', '')).toBe(100);
    });

    it('should calculate similarity percentage', () => {
      const result = calculateSimilarityPercentage('Naruto', 'Naruto Shippuden');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });

    it('should be case-insensitive', () => {
      expect(calculateSimilarityPercentage('Test', 'test')).toBe(100);
    });
  });

  describe('findPotentialDuplicates()', () => {
    const existingSeries = [
      { id: 1, title: 'Naruto' },
      { id: 2, title: 'Naruto Shippuden' },
      { id: 3, title: 'One Piece', alternateTitles: [{ title: 'ワンピース' }] },
      { id: 4, title: 'Bleach' },
    ];

    it('should find exact matches', () => {
      const matches = findPotentialDuplicates('Naruto', existingSeries, 90);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].existingTitle).toBe('Naruto');
      expect(matches[0].similarity).toBe(100);
    });

    it('should find similar titles above threshold', () => {
      const matches = findPotentialDuplicates('Naruto Shippuuden', existingSeries, 80);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.existingTitle.includes('Naruto'))).toBe(true);
    });

    it('should not find matches below threshold', () => {
      const matches = findPotentialDuplicates('Dragon Ball', existingSeries, 90);
      
      expect(matches.length).toBe(0);
    });

    it('should check alternate titles', () => {
      const matches = findPotentialDuplicates('ワンピース', existingSeries, 90);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].existingTitle).toContain('One Piece');
    });

    it('should sort by similarity descending', () => {
      const matches = findPotentialDuplicates('Naruto', existingSeries, 50);
      
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].similarity).toBeGreaterThanOrEqual(matches[i + 1].similarity);
      }
    });

    it('should handle series without alternate titles', () => {
      const matches = findPotentialDuplicates('Bleach', existingSeries, 90);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].existingTitle).toBe('Bleach');
    });
  });

  describe('calculateMonitoringFromScore()', () => {
    it('should return default config when feature disabled', () => {
      const config = calculateMonitoringFromScore(9.5, false, 9.0, 7.0, true);
      
      expect(config).toEqual({
        monitored: true,
        monitorNewItems: 'all',
        searchForMissingEpisodes: true,
      });
    });

    it('should return default config when score is null', () => {
      const config = calculateMonitoringFromScore(null, true, 9.0, 7.0, false);
      
      expect(config).toEqual({
        monitored: true,
        monitorNewItems: 'all',
        searchForMissingEpisodes: false,
      });
    });

    it('should monitor everything for high scores', () => {
      const config = calculateMonitoringFromScore(9.5, true, 9.0, 7.0, false);
      
      expect(config).toEqual({
        monitored: true,
        monitorNewItems: 'all',
        searchForMissingEpisodes: true,
      });
    });

    it('should monitor new only for medium scores', () => {
      const config = calculateMonitoringFromScore(8.0, true, 9.0, 7.0, false);
      
      expect(config).toEqual({
        monitored: true,
        monitorNewItems: 'new',
        searchForMissingEpisodes: false,
      });
    });

    it('should not monitor for low scores', () => {
      const config = calculateMonitoringFromScore(5.0, true, 9.0, 7.0, false);
      
      expect(config).toEqual({
        monitored: false,
        monitorNewItems: 'none',
        searchForMissingEpisodes: false,
      });
    });

    it('should handle edge case at high threshold', () => {
      const config = calculateMonitoringFromScore(9.0, true, 9.0, 7.0, false);
      
      expect(config.monitored).toBe(true);
      expect(config.monitorNewItems).toBe('all');
    });

    it('should handle edge case at medium threshold', () => {
      const config = calculateMonitoringFromScore(7.0, true, 9.0, 7.0, false);
      
      expect(config.monitored).toBe(true);
      expect(config.monitorNewItems).toBe('new');
    });
  });

  describe('shouldSkipBasedOnAiringStatus()', () => {
    const completedAnime: Anime = {
      malId: 1,
      title: 'Completed Anime',
      status: 'completed',
      score: 8.5,
      episodes: 24,
      season: 'spring',
      year: 2020,
    };

    const airingAnime: Anime = {
      malId: 2,
      title: 'Airing Anime',
      status: 'watching',
      score: 8.0,
      episodes: 12,
      season: 'fall',
      year: 2023,
    };

    it('should not skip when feature disabled', () => {
      expect(shouldSkipBasedOnAiringStatus(completedAnime, false)).toBe(false);
    });

    it('should skip completed anime when feature enabled', () => {
      expect(shouldSkipBasedOnAiringStatus(completedAnime, true)).toBe(true);
    });

    it('should not skip airing anime', () => {
      expect(shouldSkipBasedOnAiringStatus(airingAnime, true)).toBe(false);
    });

    it('should handle finished_airing status', () => {
      const finishedAnime = { ...completedAnime, status: 'finished_airing' };
      expect(shouldSkipBasedOnAiringStatus(finishedAnime, true)).toBe(true);
    });

    it('should be case-insensitive', () => {
      const upperAnime = { ...completedAnime, status: 'COMPLETED' };
      expect(shouldSkipBasedOnAiringStatus(upperAnime, true)).toBe(true);
    });
  });

  describe('applyAiringStatusLogic()', () => {
    const airingAnime: Anime = {
      malId: 1,
      title: 'Airing',
      status: 'watching',
      score: 8.0,
      episodes: 12,
      season: 'fall',
      year: 2023,
    };

    const completedAnime: Anime = {
      malId: 2,
      title: 'Completed',
      status: 'completed',
      score: 8.5,
      episodes: 24,
      season: 'spring',
      year: 2020,
    };

    it('should prioritize airing anime', () => {
      const result = applyAiringStatusLogic(airingAnime, false, true);
      
      expect(result.priority).toBe(1);
    });

    it('should not prioritize non-airing anime', () => {
      const result = applyAiringStatusLogic(completedAnime, false, true);
      
      expect(result.priority).toBeUndefined();
    });

    it('should monitor new items only for current season airing', () => {
      const result = applyAiringStatusLogic(airingAnime, true, false);
      
      expect(result.monitorNewItems).toBe('new');
    });

    it('should monitor all items for completed anime', () => {
      const result = applyAiringStatusLogic(completedAnime, true, false);
      
      expect(result.monitorNewItems).toBe('all');
    });

    it('should handle currently_airing status', () => {
      const currently = { ...airingAnime, status: 'currently_airing' };
      const result = applyAiringStatusLogic(currently, true, true);
      
      expect(result.priority).toBe(1);
      expect(result.monitorNewItems).toBe('new');
    });

    it('should handle both features disabled', () => {
      const result = applyAiringStatusLogic(airingAnime, false, false);
      
      expect(result.monitorNewItems).toBe('all');
      expect(result.priority).toBeUndefined();
    });
  });

  describe('shouldSkipSeriesType()', () => {
    const filterConfig: EpisodeFilterConfig = {
      skipOVAs: true,
      skipSpecials: true,
      skipMovies: true,
      onlyMainSeries: false,
    };

    it('should skip OVAs when configured', () => {
      expect(shouldSkipSeriesType('ova', filterConfig)).toBe(true);
      expect(shouldSkipSeriesType('OVA', filterConfig)).toBe(true);
      expect(shouldSkipSeriesType('Special OVA', filterConfig)).toBe(true);
    });

    it('should skip specials when configured', () => {
      expect(shouldSkipSeriesType('special', filterConfig)).toBe(true);
    });

    it('should skip movies when configured', () => {
      expect(shouldSkipSeriesType('movie', filterConfig)).toBe(true);
    });

    it('should not skip standard series', () => {
      expect(shouldSkipSeriesType('standard', filterConfig)).toBe(false);
      expect(shouldSkipSeriesType('anime', filterConfig)).toBe(false);
    });

    it('should skip non-standard when onlyMainSeries enabled', () => {
      const mainOnlyConfig = { ...filterConfig, onlyMainSeries: true };
      
      expect(shouldSkipSeriesType('ova', mainOnlyConfig)).toBe(true);
      expect(shouldSkipSeriesType('movie', mainOnlyConfig)).toBe(true);
      expect(shouldSkipSeriesType('special', mainOnlyConfig)).toBe(true);
    });

    it('should not skip standard/anime when onlyMainSeries enabled', () => {
      const mainOnlyConfig = { ...filterConfig, onlyMainSeries: true };
      
      expect(shouldSkipSeriesType('standard', mainOnlyConfig)).toBe(false);
      expect(shouldSkipSeriesType('anime', mainOnlyConfig)).toBe(false);
    });

    it('should not skip anything when all filters disabled', () => {
      const noFilters: EpisodeFilterConfig = {
        skipOVAs: false,
        skipSpecials: false,
        skipMovies: false,
        onlyMainSeries: false,
      };
      
      expect(shouldSkipSeriesType('ova', noFilters)).toBe(false);
      expect(shouldSkipSeriesType('special', noFilters)).toBe(false);
      expect(shouldSkipSeriesType('movie', noFilters)).toBe(false);
    });
  });

  describe('detectConflict()', () => {
    const watchingAnime: Anime = {
      malId: 1,
      title: 'Test Anime',
      status: 'watching',
      score: 8.0,
      episodes: 12,
      season: 'fall',
      year: 2023,
    };

    it('should detect monitoring conflict', () => {
      const sonarrSeries = { id: 123, monitored: false };
      
      const conflict = detectConflict(watchingAnime, sonarrSeries);
      
      expect(conflict).not.toBeNull();
      expect(conflict?.conflictType).toBe('monitoring');
      expect(conflict?.malStatus).toBe('watching');
      expect(conflict?.sonarrMonitored).toBe(false);
    });

    it('should not detect conflict when series monitored', () => {
      const sonarrSeries = { id: 123, monitored: true };
      
      const conflict = detectConflict(watchingAnime, sonarrSeries);
      
      expect(conflict).toBeNull();
    });

    it('should not detect conflict for non-watching anime', () => {
      const completedAnime = { ...watchingAnime, status: 'completed' };
      const sonarrSeries = { id: 123, monitored: false };
      
      const conflict = detectConflict(completedAnime, sonarrSeries);
      
      expect(conflict).toBeNull();
    });

    it('should return null when no existing series', () => {
      const conflict = detectConflict(watchingAnime, null);
      
      expect(conflict).toBeNull();
    });

    it('should be case-insensitive for status', () => {
      const upperAnime = { ...watchingAnime, status: 'WATCHING' };
      const sonarrSeries = { id: 123, monitored: false };
      
      const conflict = detectConflict(upperAnime, sonarrSeries);
      
      expect(conflict).not.toBeNull();
    });
  });

  describe('resolveConflict()', () => {
    const conflict: ConflictInfo = {
      title: 'Test Anime',
      malId: 1,
      sonarrId: 123,
      malStatus: 'watching',
      sonarrMonitored: false,
      conflictType: 'monitoring',
    };

    it('should update Sonarr when MAL wins', () => {
      expect(resolveConflict('mal-wins', conflict)).toBe('update-sonarr');
    });

    it('should skip when Sonarr wins', () => {
      expect(resolveConflict('sonarr-wins', conflict)).toBe('skip');
    });

    it('should ask user when ask-me strategy', () => {
      expect(resolveConflict('ask-me', conflict)).toBe('ask-user');
    });

    it('should skip when skip strategy', () => {
      expect(resolveConflict('skip', conflict)).toBe('skip');
    });

    it('should default to skip for unknown strategy', () => {
      expect(resolveConflict('unknown' as ConflictResolutionStrategy, conflict)).toBe('skip');
    });
  });
});
