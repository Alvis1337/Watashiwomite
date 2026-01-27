/**
 * @jest-environment node
 */

import { cache } from '@/lib/cache';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/lib/settings', () => ({
  getSettings: jest.fn().mockResolvedValue({
    sonarrUrl: 'http://localhost:8989',
    sonarrApiKey: 'test-key',
    tvdbApiKey: 'tvdb-key',
    malClientId: 'mal-client',
    malClientSecret: 'mal-secret',
  }),
}));

jest.mock('@/lib/cache', () => ({
  cache: {
    getOrSet: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  },
  CacheKeys: {
    sonarrRootFolders: () => 'sonarr:rootfolders',
    sonarrSeries: () => 'sonarr:series',
    tvdbToken: () => 'tvdb:token',
  },
  CacheTTL: {
    sonarrRootFolders: 3600000,
    sonarrSeries: 300000,
    tvdbToken: 2400000,
  },
}));

describe('Utils - Sonarr Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('getUsernameFromToken()', () => {
    const mockGetUsername = async (token: string) => {
      if (!token) throw new Error('Token is required');
      
      const response = await fetch('https://api.myanimelist.net/v2/users/@me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('MAL API error');
      const data = await response.json();
      return data.name;
    };

    it('should fetch username from MAL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'testuser' }),
      });

      const username = await mockGetUsername('test-token');

      expect(username).toBe('testuser');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.myanimelist.net/v2/users/@me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should throw on missing token', async () => {
      await expect(mockGetUsername('')).rejects.toThrow('Token is required');
    });

    it('should throw on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(mockGetUsername('invalid-token')).rejects.toThrow('MAL API error');
    });
  });

  describe('getSonarrRootFolder()', () => {
    it('should fetch root folders from cache', async () => {
      const mockFolders = [{ path: '/media/anime', id: 1 }];
      (cache.getOrSet as jest.Mock).mockResolvedValue(mockFolders);

      const mockGetRootFolder = async () => {
        return cache.getOrSet('sonarr:rootfolders', async () => mockFolders, 3600000);
      };

      const folders = await mockGetRootFolder();

      expect(folders).toEqual(mockFolders);
      expect(cache.getOrSet).toHaveBeenCalled();
    });

    it('should fetch from API when cache misses', async () => {
      const mockFolders = [{ path: '/media/anime', id: 1 }];
      
      (cache.getOrSet as jest.Mock).mockImplementation(async (key, fn) => {
        return await fn();
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFolders,
      });

      const mockGetRootFolder = async () => {
        return cache.getOrSet('sonarr:rootfolders', async () => {
          const response = await fetch('http://localhost:8989/api/v3/rootfolder', {
            headers: { 'X-Api-Key': 'test-key' },
          });
          return response.json();
        }, 3600000);
      };

      const folders = await mockGetRootFolder();

      expect(folders).toEqual(mockFolders);
    });
  });

  describe('getSonarrAnimeList()', () => {
    it('should fetch all series from Sonarr', async () => {
      const mockSeries = [
        { id: 1, title: 'Attack on Titan', tvdbId: 267440 },
        { id: 2, title: 'My Hero Academia', tvdbId: 305074 },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSeries,
      });

      const mockGetSeries = async () => {
        const response = await fetch('http://localhost:8989/api/v3/series', {
          headers: { 'X-Api-Key': 'test-key' },
        });
        return response.json();
      };

      const series = await mockGetSeries();

      expect(series).toEqual(mockSeries);
      expect(series).toHaveLength(2);
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const mockGetSeries = async () => {
        const response = await fetch('http://localhost:8989/api/v3/series', {
          headers: { 'X-Api-Key': 'test-key' },
        });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
      };

      await expect(mockGetSeries()).rejects.toThrow('401 Unauthorized');
    });
  });

  describe('getTvdbIds()', () => {
    const mockGetTvdbIds = async (titles: string[], apiKey: string) => {
      // Mock TVDB search
      const results = titles.map((title, idx) => ({
        title,
        tvdbId: 100000 + idx,
        year: 2020,
      }));
      return results;
    };

    it('should fetch TVDB IDs for titles', async () => {
      const titles = ['Attack on Titan', 'My Hero Academia'];
      const results = await mockGetTvdbIds(titles, 'tvdb-key');

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Attack on Titan');
      expect(results[0].tvdbId).toBeTruthy();
    });

    it('should handle empty titles', async () => {
      const results = await mockGetTvdbIds([], 'tvdb-key');
      expect(results).toHaveLength(0);
    });
  });

  describe('addAnimeToSonarr()', () => {
    const mockAddAnime = async (series: any, rootFolder: string, apiKey: string) => {
      const payload = {
        tvdbId: series.tvdbId,
        title: series.title,
        rootFolderPath: rootFolder,
        qualityProfileId: 1,
        languageProfileId: 1,
        monitored: true,
        addOptions: {
          searchForMissingEpisodes: false,
        },
      };

      const response = await fetch('http://localhost:8989/api/v3/series', {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to add series');
      return response.json();
    };

    it('should add anime to Sonarr', async () => {
      const mockSeries = { tvdbId: 267440, title: 'Attack on Titan' };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 123, ...mockSeries }),
      });

      const result = await mockAddAnime(mockSeries, '/media/anime', 'test-key');

      expect(result.id).toBe(123);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8989/api/v3/series',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle duplicate series', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Series already exists',
      });

      const mockSeries = { tvdbId: 267440, title: 'Attack on Titan' };

      await expect(mockAddAnime(mockSeries, '/media/anime', 'test-key')).rejects.toThrow('Failed to add series');
    });
  });
});
