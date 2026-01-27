/**
 * REAL tests for syncOrchestrationService.ts
 * These import and execute actual functions with mocked dependencies
 */

import { performSync } from '@/services/syncOrchestrationService';
import * as utils from '@/utils/utils';
import * as enhancedSync from '@/utils/enhancedSync';
import * as syncHistory from '@/utils/syncHistory';
import * as batchActions from '@/utils/batchActions';
import * as settings from '@/lib/settings';

// Mock all dependencies
jest.mock('@/utils/utils');
jest.mock('@/utils/enhancedSync');
jest.mock('@/utils/syncHistory');
jest.mock('@/utils/batchActions');
jest.mock('@/lib/settings');

const mockGetTvdbIds = utils.getTvdbIds as jest.MockedFunction<typeof utils.getTvdbIds>;
const mockGetSonarrRootFolder = utils.getSonarrRootFolder as jest.MockedFunction<typeof utils.getSonarrRootFolder>;
const mockAddAnimeToSonarrEnhanced = enhancedSync.addAnimeToSonarrEnhanced as jest.MockedFunction<typeof enhancedSync.addAnimeToSonarrEnhanced>;
const mockLogSyncHistory = syncHistory.logSyncHistory as jest.MockedFunction<typeof syncHistory.logSyncHistory>;
const mockExecuteAfterSyncActions = batchActions.executeAfterSyncActions as jest.MockedFunction<typeof batchActions.executeAfterSyncActions>;
const mockGetSettings = settings.getSettings as jest.MockedFunction<typeof settings.getSettings>;

describe('Sync Orchestration Service - REAL', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockGetSettings.mockResolvedValue({
      tvdbApiKey: 'tvdb-key-123',
      sonarrApiKey: 'sonarr-key-456',
      sonarrUrl: 'http://localhost:8989',
    });

    mockGetSonarrRootFolder.mockResolvedValue([
      { path: '/anime', id: 1 },
    ]);

    mockGetTvdbIds.mockResolvedValue([
      { title: 'Naruto', tvdbId: 123, seriesType: 'standard' },
      { title: 'Bleach', tvdbId: 456, seriesType: 'standard' },
    ]);

    mockAddAnimeToSonarrEnhanced.mockResolvedValue([
      { title: 'Naruto', success: true, sonarrId: 1 },
      { title: 'Bleach', success: true, sonarrId: 2 },
    ]);

    mockLogSyncHistory.mockResolvedValue();
    mockExecuteAfterSyncActions.mockResolvedValue();
  });

  describe('performSync()', () => {
    const mockPreferences = {
      keepSyncHistory: false,
      afterSyncRefreshMetadata: false,
      afterSyncSearchMissing: false,
      afterSyncBackupDatabase: false,
      searchForMissingEpisodes: false,
      enableSmartDuplicateDetection: true,
      fuzzyMatchThreshold: 85,
      conflictResolution: 'skip',
      scoreBasedMonitoringEnabled: false,
      scoreHighThreshold: 8,
      scoreMedThreshold: 6,
      monitorOnlyCurrentSeason: false,
      ignoreCompletedSeries: false,
      prioritizeAiring: true,
      skipOVAs: false,
      skipSpecials: false,
      skipMovies: false,
      onlyMainSeries: false,
    };

    const mockFilteredAnime = [
      { malId: 20, title: 'Naruto', score: 8.5, status: 'finished_airing' },
      { malId: 21, title: 'Bleach', score: 7.9, status: 'finished_airing' },
    ];

    it('should successfully perform sync', async () => {
      const results = await performSync(
        ['Naruto', 'Bleach'],
        mockFilteredAnime,
        mockPreferences,
        'testuser'
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ title: 'Naruto', success: true, sonarrId: 1 });
      expect(results[1]).toEqual({ title: 'Bleach', success: true, sonarrId: 2 });

      expect(mockGetSettings).toHaveBeenCalled();
      expect(mockGetTvdbIds).toHaveBeenCalledWith(['Naruto', 'Bleach'], 'tvdb-key-123');
      expect(mockGetSonarrRootFolder).toHaveBeenCalled();
      expect(mockAddAnimeToSonarrEnhanced).toHaveBeenCalled();
    });

    it('should throw error if TVDB API key not configured', async () => {
      mockGetSettings.mockResolvedValue({
        tvdbApiKey: '',
        sonarrApiKey: 'sonarr-key',
        sonarrUrl: 'http://localhost:8989',
      });

      await expect(
        performSync(['Naruto'], mockFilteredAnime, mockPreferences, 'testuser')
      ).rejects.toThrow('TVDB API key is not configured');
    });

    it('should throw error if no root folders configured', async () => {
      mockGetSonarrRootFolder.mockResolvedValue([]);

      await expect(
        performSync(['Naruto'], mockFilteredAnime, mockPreferences, 'testuser')
      ).rejects.toThrow('No root folders configured in Sonarr');
    });

    it('should throw error if root folder is null', async () => {
      mockGetSonarrRootFolder.mockResolvedValue(null as any);

      await expect(
        performSync(['Naruto'], mockFilteredAnime, mockPreferences, 'testuser')
      ).rejects.toThrow('No root folders configured in Sonarr');
    });

    it('should add not-found entries to results', async () => {
      mockGetTvdbIds.mockResolvedValue([
        { title: 'Naruto', tvdbId: 123, seriesType: 'standard' },
        // Bleach not found on TVDB
      ]);

      mockAddAnimeToSonarrEnhanced.mockResolvedValue([
        { title: 'Naruto', success: true, sonarrId: 1 },
      ]);

      const results = await performSync(
        ['Naruto', 'Bleach'],
        mockFilteredAnime,
        mockPreferences,
        'testuser'
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ title: 'Naruto', success: true, sonarrId: 1 });
      expect(results[1]).toEqual({
        title: 'Bleach',
        success: false,
        reason: 'Could not find on TVDB',
      });
    });

    it('should enrich series with MAL metadata', async () => {
      await performSync(
        ['Naruto', 'Bleach'],
        mockFilteredAnime,
        mockPreferences,
        'testuser'
      );

      const enrichedSeriesCall = mockAddAnimeToSonarrEnhanced.mock.calls[0][0];
      expect(enrichedSeriesCall[0]).toMatchObject({
        title: 'Naruto',
        tvdbId: 123,
        malId: 20,
        score: 8.5,
        status: 'finished_airing',
        seriesType: 'standard',
      });
      expect(enrichedSeriesCall[1]).toMatchObject({
        title: 'Bleach',
        tvdbId: 456,
        malId: 21,
        score: 7.9,
        status: 'finished_airing',
        seriesType: 'standard',
      });
    });

    it('should pass anime data map to enhanced sync', async () => {
      await performSync(
        ['Naruto'],
        mockFilteredAnime,
        mockPreferences,
        'testuser'
      );

      const animeDataMapCall = mockAddAnimeToSonarrEnhanced.mock.calls[0][1];
      expect(animeDataMapCall.size).toBe(2);
      expect(animeDataMapCall.get(20)).toMatchObject({
        malId: 20,
        title: 'Naruto',
      });
      expect(animeDataMapCall.get(21)).toMatchObject({
        malId: 21,
        title: 'Bleach',
      });
    });

    it('should pass root folder path to enhanced sync', async () => {
      await performSync(
        ['Naruto'],
        mockFilteredAnime,
        mockPreferences,
        'testuser'
      );

      const rootFolderCall = mockAddAnimeToSonarrEnhanced.mock.calls[0][2];
      expect(rootFolderCall).toBe('/anime');
    });

    it('should pass all preferences to enhanced sync', async () => {
      const customPreferences = {
        ...mockPreferences,
        searchForMissingEpisodes: true,
        enableSmartDuplicateDetection: false,
        fuzzyMatchThreshold: 90,
        conflictResolution: 'replace',
        scoreBasedMonitoringEnabled: true,
        scoreHighThreshold: 9,
        scoreMedThreshold: 7,
        monitorOnlyCurrentSeason: true,
        ignoreCompletedSeries: true,
        prioritizeAiring: false,
        skipOVAs: true,
        skipSpecials: true,
        skipMovies: true,
        onlyMainSeries: true,
      };

      await performSync(['Naruto'], mockFilteredAnime, customPreferences, 'testuser');

      const preferencesCall = mockAddAnimeToSonarrEnhanced.mock.calls[0][3];
      expect(preferencesCall).toEqual({
        searchForMissingEpisodes: true,
        enableSmartDuplicateDetection: false,
        fuzzyMatchThreshold: 90,
        conflictResolution: 'replace',
        scoreBasedMonitoringEnabled: true,
        scoreHighThreshold: 9,
        scoreMedThreshold: 7,
        monitorOnlyCurrentSeason: true,
        ignoreCompletedSeries: true,
        prioritizeAiring: false,
        skipOVAs: true,
        skipSpecials: true,
        skipMovies: true,
        onlyMainSeries: true,
      });
    });

    it('should use default preference values when undefined', async () => {
      const minimalPreferences = {} as any;

      await performSync(['Naruto'], mockFilteredAnime, minimalPreferences, 'testuser');

      const preferencesCall = mockAddAnimeToSonarrEnhanced.mock.calls[0][3];
      expect(preferencesCall).toEqual({
        searchForMissingEpisodes: false,
        enableSmartDuplicateDetection: true,
        fuzzyMatchThreshold: 85,
        conflictResolution: 'skip',
        scoreBasedMonitoringEnabled: false,
        scoreHighThreshold: 8,
        scoreMedThreshold: 6,
        monitorOnlyCurrentSeason: false,
        ignoreCompletedSeries: false,
        prioritizeAiring: true,
        skipOVAs: false,
        skipSpecials: false,
        skipMovies: false,
        onlyMainSeries: false,
      });
    });

    it('should log sync history when enabled', async () => {
      const preferencesWithHistory = {
        ...mockPreferences,
        keepSyncHistory: true,
      };

      await performSync(
        ['Naruto', 'Bleach'],
        mockFilteredAnime,
        preferencesWithHistory,
        'testuser'
      );

      expect(mockLogSyncHistory).toHaveBeenCalledWith({
        username: 'testuser',
        addedAnime: [
          { malId: 20, title: 'Naruto', sonarrId: 1 },
          { malId: 21, title: 'Bleach', sonarrId: 2 },
        ],
        removedAnime: [],
        updatedAnime: [],
        success: true,
      });
    });

    it('should not log sync history when disabled', async () => {
      await performSync(
        ['Naruto'],
        mockFilteredAnime,
        mockPreferences,
        'testuser'
      );

      expect(mockLogSyncHistory).not.toHaveBeenCalled();
    });

    it('should handle sync history logging error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLogSyncHistory.mockRejectedValue(new Error('DB error'));

      mockGetTvdbIds.mockResolvedValue([
        { title: 'Naruto', tvdbId: 123, seriesType: 'standard' },
      ]);

      mockAddAnimeToSonarrEnhanced.mockResolvedValue([
        { title: 'Naruto', success: true, sonarrId: 1 },
      ]);

      const preferencesWithHistory = {
        ...mockPreferences,
        keepSyncHistory: true,
      };

      const results = await performSync(
        ['Naruto'],
        [mockFilteredAnime[0]],
        preferencesWithHistory,
        'testuser'
      );

      expect(results).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Sync] Failed to log sync history:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should execute batch actions when enabled', async () => {
      const preferencesWithBatchActions = {
        ...mockPreferences,
        afterSyncRefreshMetadata: true,
        afterSyncSearchMissing: true,
        afterSyncBackupDatabase: true,
      };

      await performSync(
        ['Naruto', 'Bleach'],
        mockFilteredAnime,
        preferencesWithBatchActions,
        'testuser'
      );

      expect(mockExecuteAfterSyncActions).toHaveBeenCalledWith(
        {
          afterSyncRefreshMetadata: true,
          afterSyncSearchMissing: true,
          afterSyncBackupDatabase: true,
        },
        [1, 2],
        'testuser',
        'sonarr-key-456',
        'http://localhost:8989'
      );
    });

    it('should not execute batch actions when all disabled', async () => {
      mockGetTvdbIds.mockResolvedValue([
        { title: 'Naruto', tvdbId: 123, seriesType: 'standard' },
      ]);

      mockAddAnimeToSonarrEnhanced.mockResolvedValue([
        { title: 'Naruto', success: true, sonarrId: 1 },
      ]);

      await performSync(
        ['Naruto'],
        [mockFilteredAnime[0]],
        mockPreferences,
        'testuser'
      );

      expect(mockExecuteAfterSyncActions).toHaveBeenCalledWith(
        {
          afterSyncRefreshMetadata: false,
          afterSyncSearchMissing: false,
          afterSyncBackupDatabase: false,
        },
        [1],
        'testuser',
        'sonarr-key-456',
        'http://localhost:8989'
      );
    });

    it('should not execute batch actions when no anime added', async () => {
      mockAddAnimeToSonarrEnhanced.mockResolvedValue([
        { title: 'Naruto', success: false, reason: 'Duplicate' },
      ]);

      await performSync(
        ['Naruto'],
        mockFilteredAnime,
        mockPreferences,
        'testuser'
      );

      // Not called when no anime was successfully added
      expect(mockExecuteAfterSyncActions).not.toHaveBeenCalled();
    });

    it('should handle batch actions error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockExecuteAfterSyncActions.mockRejectedValue(new Error('Batch error'));

      mockGetTvdbIds.mockResolvedValue([
        { title: 'Naruto', tvdbId: 123, seriesType: 'standard' },
      ]);

      mockAddAnimeToSonarrEnhanced.mockResolvedValue([
        { title: 'Naruto', success: true, sonarrId: 1 },
      ]);

      const results = await performSync(
        ['Naruto'],
        [mockFilteredAnime[0]],
        mockPreferences,
        'testuser'
      );

      expect(results).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Sync] Failed to execute batch actions:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle anime without malId in data map', async () => {
      const animeWithoutMalId = [
        { title: 'Naruto', score: 8.5 }, // No malId
        { malId: 21, title: 'Bleach', score: 7.9 },
      ];

      await performSync(['Naruto'], animeWithoutMalId, mockPreferences, 'testuser');

      const animeDataMapCall = mockAddAnimeToSonarrEnhanced.mock.calls[0][1];
      expect(animeDataMapCall.size).toBe(1); // Only Bleach has malId
      expect(animeDataMapCall.get(21)).toBeDefined();
    });

    it('should handle anime not found in filtered list during enrichment', async () => {
      const limitedAnime = [
        { malId: 20, title: 'Naruto', score: 8.5, status: 'finished_airing' },
        // Bleach not in filtered list
      ];

      mockGetTvdbIds.mockResolvedValue([
        { title: 'Naruto', tvdbId: 123, seriesType: 'standard' },
        { title: 'Bleach', tvdbId: 456, seriesType: 'standard' },
      ]);

      await performSync(['Naruto', 'Bleach'], limitedAnime, mockPreferences, 'testuser');

      const enrichedSeriesCall = mockAddAnimeToSonarrEnhanced.mock.calls[0][0];
      expect(enrichedSeriesCall[0]).toMatchObject({
        title: 'Naruto',
        malId: 20,
        score: 8.5,
        status: 'finished_airing',
      });
      expect(enrichedSeriesCall[1]).toMatchObject({
        title: 'Bleach',
        malId: undefined,
        score: undefined,
        status: undefined,
      });
    });

    it('should only include successfully added anime in sync history', async () => {
      mockAddAnimeToSonarrEnhanced.mockResolvedValue([
        { title: 'Naruto', success: true, sonarrId: 1 },
        { title: 'Bleach', success: false, reason: 'Duplicate' },
      ]);

      const preferencesWithHistory = {
        ...mockPreferences,
        keepSyncHistory: true,
      };

      await performSync(
        ['Naruto', 'Bleach'],
        mockFilteredAnime,
        preferencesWithHistory,
        'testuser'
      );

      expect(mockLogSyncHistory).toHaveBeenCalledWith({
        username: 'testuser',
        addedAnime: [
          { malId: 20, title: 'Naruto', sonarrId: 1 },
        ],
        removedAnime: [],
        updatedAnime: [],
        success: true,
      });
    });

    it('should handle missing malId in sync history logging', async () => {
      mockAddAnimeToSonarrEnhanced.mockResolvedValue([
        { title: 'Unknown Anime', success: true, sonarrId: 1 },
      ]);

      const preferencesWithHistory = {
        ...mockPreferences,
        keepSyncHistory: true,
      };

      await performSync(
        ['Unknown Anime'],
        mockFilteredAnime,
        preferencesWithHistory,
        'testuser'
      );

      expect(mockLogSyncHistory).toHaveBeenCalledWith({
        username: 'testuser',
        addedAnime: [
          { malId: 0, title: 'Unknown Anime', sonarrId: 1 },
        ],
        removedAnime: [],
        updatedAnime: [],
        success: true,
      });
    });
  });
});
