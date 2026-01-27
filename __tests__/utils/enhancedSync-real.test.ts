/**
 * Real tests for enhancedSync.ts
 * Tests the enhanced sync with all 8 advanced features
 */

import { addAnimeToSonarrEnhanced, AnimeSeries, SyncPreferences } from '@/utils/enhancedSync';
import { Anime } from '@/types/interfaces';

// Mock dependencies
jest.mock('@/lib/settings');
jest.mock('@/lib/cache');
jest.mock('@/utils/syncFeatures');

import { getSettings } from '@/lib/settings';
import * as syncFeatures from '@/utils/syncFeatures';

describe('Enhanced Sync', () => {
  const mockSettings = {
    sonarrUrl: 'http://sonarr.local',
    sonarrApiKey: 'test-api-key',
    tvdbApiKey: 'test-tvdb-key',
    malClientId: 'test-client-id',
    malClientSecret: 'test-secret',
  };

  const defaultPreferences: SyncPreferences = {
    searchForMissingEpisodes: true,
    enableSmartDuplicateDetection: true,
    fuzzyMatchThreshold: 0.8,
    conflictResolution: 'prefer-mal',
    scoreBasedMonitoringEnabled: true,
    scoreHighThreshold: 8,
    scoreMedThreshold: 6,
    monitorOnlyCurrentSeason: false,
    ignoreCompletedSeries: false,
    prioritizeAiring: false,
    skipOVAs: false,
    skipSpecials: false,
    skipMovies: false,
    onlyMainSeries: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getSettings as jest.Mock).mockResolvedValue(mockSettings);
    global.fetch = jest.fn();

    // Set up default mocks for syncFeatures
    (syncFeatures.shouldSkipSeriesType as jest.Mock).mockReturnValue(false);
    (syncFeatures.shouldSkipBasedOnAiringStatus as jest.Mock).mockReturnValue(false);
    (syncFeatures.detectConflict as jest.Mock).mockReturnValue(null);
    (syncFeatures.findPotentialDuplicates as jest.Mock).mockReturnValue([]);
    (syncFeatures.calculateMonitoringFromScore as jest.Mock).mockReturnValue({
      monitored: true,
      monitorNewItems: 'all',
      searchForMissingEpisodes: true,
    });
    (syncFeatures.applyAiringStatusLogic as jest.Mock).mockReturnValue({
      monitorNewItems: 'all',
      priority: undefined,
    });
  });

  describe('addAnimeToSonarrEnhanced', () => {
    it('should throw error if Sonarr API key is not configured', async () => {
      (getSettings as jest.Mock).mockResolvedValue({
        ...mockSettings,
        sonarrApiKey: undefined,
      });

      const series: AnimeSeries[] = [
        { title: 'Test Anime', tvdbId: '12345' },
      ];
      const animeData = new Map<number, Anime>();

      await expect(
        addAnimeToSonarrEnhanced(series, animeData, '/anime', defaultPreferences)
      ).rejects.toThrow('Sonarr API key is not configured');
    });

    it('should successfully add anime to Sonarr', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock add series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 100, title: 'Naruto' }),
      });

      const series: AnimeSeries[] = [
        { title: 'Naruto', tvdbId: '78857', malId: 20, score: 8.5 },
      ];
      const animeData = new Map<number, Anime>([[
        20,
        {
          mal_id: 20,
          title: 'Naruto',
          score: 8.5,
          status: 'Finished Airing',
          type: 'TV',
        } as Anime,
      ]]);

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Naruto',
        success: true,
        sonarrId: 100,
      });
    });

    it('should skip series based on type filtering (OVA)', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Override default mock for this test
      (syncFeatures.shouldSkipSeriesType as jest.Mock).mockReturnValue(true);

      const series: AnimeSeries[] = [
        { title: 'Test OVA', tvdbId: '12345', seriesType: 'OVA' },
      ];
      const animeData = new Map<number, Anime>();

      const preferences = {
        ...defaultPreferences,
        skipOVAs: true,
      };

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        preferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Test OVA',
        success: false,
        reason: 'Skipped: OVA (filtered by preferences)',
      });
    });

    it('should skip completed series if ignoreCompletedSeries is true', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Override default mock for this test
      (syncFeatures.shouldSkipBasedOnAiringStatus as jest.Mock).mockReturnValue(true);

      const series: AnimeSeries[] = [
        { title: 'Completed Anime', tvdbId: '12345', malId: 30, status: 'Finished Airing' },
      ];
      const animeData = new Map<number, Anime>([[
        30,
        {
          mal_id: 30,
          title: 'Completed Anime',
          status: 'Finished Airing',
          type: 'TV',
        } as Anime,
      ]]);

      const preferences = {
        ...defaultPreferences,
        ignoreCompletedSeries: true,
      };

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        preferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Completed Anime',
        success: false,
        reason: 'Skipped: Completed series (filtered by preferences)',
      });
    });

    it('should skip existing series in Sonarr', async () => {
      // Mock existing series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 50, tvdbId: 78857, title: 'Naruto', monitored: true },
        ],
      });

      const series: AnimeSeries[] = [
        { title: 'Naruto', tvdbId: '78857' },
      ];
      const animeData = new Map<number, Anime>();

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Naruto',
        success: false,
        reason: 'Already exists in Sonarr',
      });
    });

    it('should detect and resolve conflicts with prefer-mal strategy', async () => {
      // Mock existing series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 50, tvdbId: 78857, title: 'Naruto', monitored: false },
        ],
      });

      // Mock PUT update
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 50, monitored: true }),
      });

      // Override default mocks for this test
      (syncFeatures.detectConflict as jest.Mock).mockReturnValue({
        type: 'monitoring-mismatch',
        malValue: true,
        sonarrValue: false,
      });
      (syncFeatures.resolveConflict as jest.Mock).mockReturnValue('update-sonarr');

      const series: AnimeSeries[] = [
        { title: 'Naruto', tvdbId: '78857', malId: 20 },
      ];
      const animeData = new Map<number, Anime>([[
        20,
        {
          mal_id: 20,
          title: 'Naruto',
          status: 'Currently Airing',
          type: 'TV',
        } as Anime,
      ]]);

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Naruto',
        success: true,
        reason: 'Updated to match MAL status',
        sonarrId: 50,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://sonarr.local/api/v3/series/50',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should skip conflict when resolution is ask-user', async () => {
      // Mock existing series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 50, tvdbId: 78857, title: 'Naruto', monitored: false },
        ],
      });

      // Override default mocks for this test
      (syncFeatures.detectConflict as jest.Mock).mockReturnValue({
        type: 'monitoring-mismatch',
        malValue: true,
        sonarrValue: false,
      });
      (syncFeatures.resolveConflict as jest.Mock).mockReturnValue('ask-user');

      const series: AnimeSeries[] = [
        { title: 'Naruto', tvdbId: '78857', malId: 20 },
      ];
      const animeData = new Map<number, Anime>([[
        20,
        {
          mal_id: 20,
          title: 'Naruto',
          status: 'Currently Airing',
          type: 'TV',
        } as Anime,
      ]]);

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Naruto',
        success: false,
        reason: 'Conflict requires user decision',
        conflictSkipped: true,
      });
    });

    it('should handle conflict update failure', async () => {
      // Mock existing series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 50, tvdbId: 78857, title: 'Naruto', monitored: false },
        ],
      });

      // Mock PUT update failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Override default mocks for this test
      (syncFeatures.detectConflict as jest.Mock).mockReturnValue({
        type: 'monitoring-mismatch',
        malValue: true,
        sonarrValue: false,
      });
      (syncFeatures.resolveConflict as jest.Mock).mockReturnValue('update-sonarr');

      const series: AnimeSeries[] = [
        { title: 'Naruto', tvdbId: '78857', malId: 20 },
      ];
      const animeData = new Map<number, Anime>([[
        20,
        {
          mal_id: 20,
          title: 'Naruto',
          status: 'Currently Airing',
          type: 'TV',
        } as Anime,
      ]]);

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Naruto',
        success: false,
        reason: 'Failed to update conflict',
      });
    });

    it('should detect smart duplicates when enabled', async () => {
      // Mock existing series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 100, tvdbId: 99999, title: 'Naruto Shippuden', monitored: true },
        ],
      });

      // Override default mock for this test
      (syncFeatures.findPotentialDuplicates as jest.Mock).mockReturnValue([
        { existingTitle: 'Naruto Shippuden', similarity: 85 },
      ]);

      const series: AnimeSeries[] = [
        { title: 'Naruto: Shippuuden', tvdbId: '78857' },
      ];
      const animeData = new Map<number, Anime>();

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: 'Naruto: Shippuuden',
        success: false,
        duplicate: true,
      });
      expect(results[0].reason).toContain('Potential duplicate');
      expect(results[0].reason).toContain('Naruto Shippuden');
    });

    it('should not detect duplicates when disabled', async () => {
      // Mock existing series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock add series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 100, title: 'Naruto' }),
      });

      const series: AnimeSeries[] = [
        { title: 'Naruto', tvdbId: '78857' },
      ];
      const animeData = new Map<number, Anime>();

      const preferences = {
        ...defaultPreferences,
        enableSmartDuplicateDetection: false,
      };

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        preferences
      );

      expect(syncFeatures.findPotentialDuplicates).not.toHaveBeenCalled();
      expect(results[0].success).toBe(true);
    });

    it('should apply score-based monitoring', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock add series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 100, title: 'High Score Anime' }),
      });

      const series: AnimeSeries[] = [
        { title: 'High Score Anime', tvdbId: '12345', malId: 50, score: 9.5 },
      ];
      const animeData = new Map<number, Anime>([[
        50,
        {
          mal_id: 50,
          title: 'High Score Anime',
          score: 9.5,
          status: 'Currently Airing',
          type: 'TV',
        } as Anime,
      ]]);

      await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(syncFeatures.calculateMonitoringFromScore).toHaveBeenCalledWith(
        9.5,
        true,
        8,
        6,
        true
      );
    });

    it('should apply airing status logic', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock add series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 100, title: 'Airing Anime' }),
      });

      const series: AnimeSeries[] = [
        { title: 'Airing Anime', tvdbId: '12345', malId: 60 },
      ];
      const animeData = new Map<number, Anime>([[
        60,
        {
          mal_id: 60,
          title: 'Airing Anime',
          status: 'Currently Airing',
          type: 'TV',
          aired: { from: '2024-01-01', to: null },
        } as Anime,
      ]]);

      await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(syncFeatures.applyAiringStatusLogic).toHaveBeenCalledWith(
        expect.objectContaining({ mal_id: 60 }),
        false,
        false
      );
    });

    it('should handle Sonarr duplicate error gracefully', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock add series with duplicate error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify([
          { errorCode: 'SeriesTitleSlugValidator', errorMessage: 'Already exists' },
        ]),
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const series: AnimeSeries[] = [
        { title: 'Naruto', tvdbId: '78857' },
      ];
      const animeData = new Map<number, Anime>();

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Naruto',
        success: false,
        reason: 'Already in Sonarr (skipped)',
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle Sonarr API errors', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock add series with error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const series: AnimeSeries[] = [
        { title: 'Test Anime', tvdbId: '12345' },
      ];
      const animeData = new Map<number, Anime>();

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Test Anime',
        success: false,
        reason: 'API error: 500',
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors during add', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock add series with network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const series: AnimeSeries[] = [
        { title: 'Test Anime', tvdbId: '12345' },
      ];
      const animeData = new Map<number, Anime>();

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Test Anime',
        success: false,
        reason: 'Network timeout',
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle fetch existing series failure gracefully', async () => {
      // Mock existing series check failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      // Mock add series success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 100, title: 'Test Anime' }),
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const series: AnimeSeries[] = [
        { title: 'Test Anime', tvdbId: '12345' },
      ];
      const animeData = new Map<number, Anime>();

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      // Should continue and add series even if existing fetch failed
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[EnhancedSync] Failed to fetch existing series:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should process multiple series correctly', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock add first series success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 100, title: 'Naruto' }),
      });

      // Mock add second series success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 101, title: 'Bleach' }),
      });

      const series: AnimeSeries[] = [
        { title: 'Naruto', tvdbId: '78857' },
        { title: 'Bleach', tvdbId: '74796' },
      ];
      const animeData = new Map<number, Anime>();

      const results = await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        title: 'Naruto',
        success: true,
        sonarrId: 100,
      });
      expect(results[1]).toEqual({
        title: 'Bleach',
        success: true,
        sonarrId: 101,
      });
    });

    it('should use score from series when anime data not available', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock add series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 100, title: 'Test Anime' }),
      });

      const series: AnimeSeries[] = [
        { title: 'Test Anime', tvdbId: '12345', score: 7.5 },
      ];
      const animeData = new Map<number, Anime>();

      await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(syncFeatures.calculateMonitoringFromScore).toHaveBeenCalledWith(
        7.5,
        true,
        8,
        6,
        true
      );
    });

    it('should use null score when neither anime data nor series score available', async () => {
      // Mock existing series check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock add series
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 100, title: 'Test Anime' }),
      });

      const series: AnimeSeries[] = [
        { title: 'Test Anime', tvdbId: '12345' },
      ];
      const animeData = new Map<number, Anime>();

      await addAnimeToSonarrEnhanced(
        series,
        animeData,
        '/anime',
        defaultPreferences
      );

      expect(syncFeatures.calculateMonitoringFromScore).toHaveBeenCalledWith(
        null,
        true,
        8,
        6,
        true
      );
    });
  });
});
