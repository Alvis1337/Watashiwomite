import { getSonarrRootFolder, getSonarrAnimeList, saveSonarrSeries } from '@/utils/sonarr';
import { cache } from '@/lib/cache';
import { getSettings } from '@/lib/settings';
import type { SonarrRootFolder, SonarrSeries } from '@/types/external';

jest.mock('@/lib/cache');
jest.mock('@/lib/settings');
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    animeList: {
      upsert: jest.fn(),
    },
    sonarrSeries: {
      upsert: jest.fn(),
    },
    sonarrSeriesGenre: {
      createMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;

describe('Sonarr Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockGetSettings.mockResolvedValue({
      sonarrUrl: 'http://localhost:8989',
      sonarrApiKey: 'test-api-key',
      tvdbApiKey: 'test-tvdb-key',
      malClientId: '',
      malClientSecret: '',
      malRedirectUri: '',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSonarrRootFolder', () => {
    const mockRootFolders: SonarrRootFolder[] = [
      {
        id: 1,
        path: '/media/anime',
        accessible: true,
        freeSpace: 1000000000,
        unmappedFolders: [],
      },
    ];

    it('should fetch root folders from Sonarr', async () => {
      (cache.getOrSet as jest.Mock).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRootFolders,
      });

      const result = await getSonarrRootFolder();

      expect(result).toEqual(mockRootFolders);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8989/api/v3/rootfolder', {
        headers: { 'X-Api-Key': 'test-api-key' },
      });
    });

    it('should return cached root folders if available', async () => {
      (cache.getOrSet as jest.Mock).mockResolvedValueOnce(mockRootFolders);

      const result = await getSonarrRootFolder();

      expect(result).toEqual(mockRootFolders);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if Sonarr is not configured', async () => {
      mockGetSettings.mockResolvedValueOnce({
        sonarrUrl: '',
        sonarrApiKey: '',
        tvdbApiKey: '',
        malClientId: '',
        malClientSecret: '',
        malRedirectUri: '',
      });

      await expect(getSonarrRootFolder()).rejects.toThrow(
        'Sonarr is not configured. Please complete setup.'
      );
    });

    it('should throw error if Sonarr API fails', async () => {
      (cache.getOrSet as jest.Mock).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API Key',
      });

      await expect(getSonarrRootFolder()).rejects.toThrow('Sonarr API error: 401 Unauthorized');
    });

    it('should handle network errors', async () => {
      (cache.getOrSet as jest.Mock).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(getSonarrRootFolder()).rejects.toThrow('Network error');
    });
  });

  describe('getSonarrAnimeList', () => {
    const mockSeries: SonarrSeries[] = [
      {
        id: 1,
        title: 'Test Anime',
        alternateTitles: [],
        sortTitle: 'test anime',
        status: 'continuing',
        overview: 'Test overview',
        network: 'Test Network',
        images: [],
        seasons: [],
        year: 2024,
        path: '/media/anime/test',
        qualityProfileId: 1,
        seasonFolder: true,
        monitored: true,
        monitorNewItems: 'all',
        useSceneNumbering: false,
        runtime: 24,
        tvdbId: 12345,
        tvRageId: 0,
        tvMazeId: 0,
        tmdbId: 0,
        seriesType: 'standard',
        cleanTitle: 'testanime',
        titleSlug: 'test-anime',
        rootFolderPath: '/media/anime',
        languageProfileId: 1,
      },
    ];

    it('should fetch anime list from Sonarr', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSeries,
      });

      const result = await getSonarrAnimeList();

      expect(result).toEqual(mockSeries);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8989/api/v3/series', {
        headers: { 'X-Api-Key': 'test-api-key' },
      });
    });

    it('should throw error if Sonarr is not configured', async () => {
      mockGetSettings.mockResolvedValueOnce({
        sonarrUrl: '',
        sonarrApiKey: '',
        tvdbApiKey: '',
        malClientId: '',
        malClientSecret: '',
        malRedirectUri: '',
      });

      await expect(getSonarrAnimeList()).rejects.toThrow(
        'Sonarr is not configured. Please complete setup.'
      );
    });

    it('should throw error if Sonarr API fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error details',
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(getSonarrAnimeList()).rejects.toThrow('Sonarr API error: 500');

      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(getSonarrAnimeList()).rejects.toThrow('Connection refused');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveSonarrSeries', () => {
    const mockSeries: SonarrSeries[] = [
      {
        id: 1,
        title: 'Test Anime',
        alternateTitles: [],
        sortTitle: 'test anime',
        status: 'continuing',
        overview: 'Test overview',
        network: 'Test Network',
        airTime: '12:00',
        images: [],
        originalLanguage: { name: 'Japanese' },
        seasons: [],
        year: 2024,
        path: '/media/anime/test',
        qualityProfileId: 1,
        seasonFolder: true,
        monitored: true,
        monitorNewItems: 'all',
        useSceneNumbering: false,
        runtime: 24,
        tvdbId: 12345,
        tvRageId: 0,
        tvMazeId: 0,
        tmdbId: 0,
        firstAired: '2024-01-01T00:00:00Z',
        lastAired: '2024-12-31T00:00:00Z',
        seriesType: 'standard',
        cleanTitle: 'testanime',
        imdbId: 'tt1234567',
        titleSlug: 'test-anime',
        rootFolderPath: '/media/anime',
        certification: 'TV-14',
        genres: ['Action', 'Adventure'],
        added: '2024-01-01T00:00:00Z',
        ratings: { value: 8.5 },
        statistics: { episodeCount: 12 },
        languageProfileId: 1,
      },
    ];

    beforeEach(() => {
      (prisma.animeList.upsert as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.sonarrSeries.upsert as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.sonarrSeriesGenre.createMany as jest.Mock).mockResolvedValue({ count: 2 });
    });

    it('should save Sonarr series to database', async () => {
      await saveSonarrSeries('testuser', mockSeries);

      expect(prisma.animeList.upsert).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        update: {},
        create: { username: 'testuser' },
      });

      expect(prisma.sonarrSeries.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: expect.objectContaining({
          title: 'Test Anime',
          status: 'continuing',
        }),
        create: expect.objectContaining({
          id: 1,
          title: 'Test Anime',
          animeListId: 1,
        }),
      });

      expect(prisma.sonarrSeriesGenre.createMany).toHaveBeenCalledWith({
        data: [
          { genre: 'Action', sonarrSeriesId: 1 },
          { genre: 'Adventure', sonarrSeriesId: 1 },
        ],
        skipDuplicates: true,
      });
    });

    it('should throw error if username is missing', async () => {
      await expect(saveSonarrSeries('', mockSeries)).rejects.toThrow('Username is required');
      expect(prisma.animeList.upsert).not.toHaveBeenCalled();
    });

    it('should handle empty Sonarr data', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await saveSonarrSeries('testuser', []);

      expect(prisma.animeList.upsert).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle null Sonarr data', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await saveSonarrSeries('testuser', null as any);

      expect(prisma.animeList.upsert).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle series with missing optional fields', async () => {
      const minimalSeries: SonarrSeries[] = [
        {
          id: 2,
          title: 'Minimal Anime',
          sortTitle: 'minimal',
          status: 'ended',
          year: 2023,
          path: '/media/anime/minimal',
          qualityProfileId: 1,
          seasonFolder: false,
          monitored: false,
          monitorNewItems: 'none',
          useSceneNumbering: false,
          runtime: 24,
          tvdbId: 67890,
          tvRageId: 0,
          tvMazeId: 0,
          tmdbId: 0,
          seriesType: 'standard',
          cleanTitle: 'minimalanime',
          titleSlug: 'minimal-anime',
          rootFolderPath: '/media/anime',
          languageProfileId: 1,
        } as SonarrSeries,
      ];

      await saveSonarrSeries('testuser', minimalSeries);

      expect(prisma.sonarrSeries.upsert).toHaveBeenCalledWith({
        where: { id: 2 },
        update: expect.objectContaining({
          overview: 'None',
          network: 'None',
          imdbId: '0',
        }),
        create: expect.objectContaining({
          overview: 'None',
          network: 'None',
          originalLanguage: 'Unknown',
        }),
      });
    });

    it('should continue on individual series save errors', async () => {
      const multipleSeries = [mockSeries[0], { ...mockSeries[0], id: 2 }];
      (prisma.sonarrSeries.upsert as jest.Mock)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 2 });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await saveSonarrSeries('testuser', multipleSeries);

      expect(prisma.sonarrSeries.upsert).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle genre insert failures gracefully', async () => {
      (prisma.sonarrSeriesGenre.createMany as jest.Mock).mockRejectedValueOnce(
        new Error('Genre error')
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await saveSonarrSeries('testuser', mockSeries);

      // Should not throw, just log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to batch insert genres:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('should skip genre insert if no genres present', async () => {
      const seriesWithoutGenres = [
        {
          ...mockSeries[0],
          genres: undefined,
        } as SonarrSeries,
      ];

      await saveSonarrSeries('testuser', seriesWithoutGenres);

      expect(prisma.sonarrSeriesGenre.createMany).not.toHaveBeenCalled();
    });

    it('should handle empty genres array', async () => {
      const seriesWithEmptyGenres = [
        {
          ...mockSeries[0],
          genres: [],
        },
      ];

      await saveSonarrSeries('testuser', seriesWithEmptyGenres);

      expect(prisma.sonarrSeriesGenre.createMany).not.toHaveBeenCalled();
    });

    it('should batch insert all genres from multiple series', async () => {
      const multipleSeries: SonarrSeries[] = [
        { ...mockSeries[0], id: 1, genres: ['Action', 'Adventure'] },
        { ...mockSeries[0], id: 2, genres: ['Comedy', 'Romance'] },
      ];

      await saveSonarrSeries('testuser', multipleSeries);

      expect(prisma.sonarrSeriesGenre.createMany).toHaveBeenCalledWith({
        data: [
          { genre: 'Action', sonarrSeriesId: 1 },
          { genre: 'Adventure', sonarrSeriesId: 1 },
          { genre: 'Comedy', sonarrSeriesId: 1 },
          { genre: 'Romance', sonarrSeriesId: 1 },
        ],
        skipDuplicates: true,
      });
    });

    it('should throw error on database failure', async () => {
      (prisma.animeList.upsert as jest.Mock).mockRejectedValueOnce(new Error('DB connection lost'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(saveSonarrSeries('testuser', mockSeries)).rejects.toThrow(
        'Failed to save Sonarr series to database'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle previousAiring as undefined', async () => {
      const seriesWithNoPreviousAiring = [
        {
          ...mockSeries[0],
          previousAiring: undefined,
        } as SonarrSeries,
      ];

      await saveSonarrSeries('testuser', seriesWithNoPreviousAiring);

      expect(prisma.sonarrSeries.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            previousAiring: undefined,
          }),
        })
      );
    });

    it('should use default dates for firstAired and lastAired in create', async () => {
      const seriesWithNoDates = [
        {
          ...mockSeries[0],
          firstAired: undefined,
          lastAired: undefined,
          added: undefined,
        } as SonarrSeries,
      ];

      await saveSonarrSeries('testuser', seriesWithNoDates);

      expect(prisma.sonarrSeries.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            firstAired: expect.any(Date),
            lastAired: expect.any(Date),
            added: expect.any(Date),
          }),
        })
      );
    });
  });
});
