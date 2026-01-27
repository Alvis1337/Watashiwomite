/**
 * Real tests for utils/utils.ts
 * Tests actual function logic with mocked dependencies
 */

import {
  getUsernameFromToken,
  getSonarrRootFolder,
  getSonarrAnimeList,
  getTvdbIds,
} from '@/utils/utils';

// Mock all dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/lib/cache', () => ({
  cache: {
    getOrSet: jest.fn(),
  },
  CacheKeys: {
    sonarrRootFolders: jest.fn(() => 'sonarr:rootfolders'),
    sonarrSeries: jest.fn(() => 'sonarr:series'),
    tvdbToken: jest.fn(() => 'tvdb:token'),
    tvdbSearch: jest.fn((query: string) => `tvdb:search:${query}`),
  },
  CacheTTL: {
    sonarrRootFolders: 3600000,
    sonarrSeries: 300000,
    tvdbToken: 3600000,
    tvdbSearch: 86400000,
  },
}));

jest.mock('@/lib/settings', () => ({
  getSettings: jest.fn(),
}));

import { cache } from '@/lib/cache';
import { getSettings } from '@/lib/settings';

const mockCache = cache as jest.Mocked<typeof cache>;
const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;

// Mock global fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Utils - REAL TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsernameFromToken()', () => {
    it('should get username from MAL token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'testuser', id: 12345 }),
      } as Response);

      const result = await getUsernameFromToken('test-token');

      expect(result).toBe('testuser');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.myanimelist.net/v2/users/@me',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should throw if token is missing', async () => {
      await expect(getUsernameFromToken('')).rejects.toThrow('Token is required');
    });

    it('should throw on MAL API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(getUsernameFromToken('invalid-token')).rejects.toThrow(
        'Failed to fetch username from MyAnimeList'
      );
    });

    it('should throw on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getUsernameFromToken('test-token')).rejects.toThrow(
        'Failed to fetch username from MyAnimeList'
      );
    });
  });

  describe('getSonarrRootFolder()', () => {
    it('should get root folders from Sonarr', async () => {
      mockGetSettings.mockResolvedValue({
        sonarrUrl: 'http://localhost:8989',
        sonarrApiKey: 'test-api-key',
        malClientId: '',
        malClientSecret: '',
        malRedirectUri: '',
        tvdbApiKey: '',
      });

      const mockFolders = [
        { id: 1, path: '/anime', freeSpace: 1000000 },
        { id: 2, path: '/anime2', freeSpace: 2000000 },
      ];

      mockCache.getOrSet.mockResolvedValueOnce(mockFolders);

      const result = await getSonarrRootFolder();

      expect(result).toEqual(mockFolders);
      expect(mockCache.getOrSet).toHaveBeenCalled();
    });

    it('should throw if Sonarr not configured', async () => {
      mockGetSettings.mockResolvedValue({
        sonarrUrl: '',
        sonarrApiKey: '',
        malClientId: '',
        malClientSecret: '',
        malRedirectUri: '',
        tvdbApiKey: '',
      });

      await expect(getSonarrRootFolder()).rejects.toThrow(
        'Sonarr is not configured'
      );
    });

    it('should handle Sonarr API errors', async () => {
      mockGetSettings.mockResolvedValue({
        sonarrUrl: 'http://localhost:8989',
        sonarrApiKey: 'test-api-key',
        malClientId: '',
        malClientSecret: '',
        malRedirectUri: '',
        tvdbApiKey: '',
      });

      mockCache.getOrSet.mockRejectedValueOnce(new Error('Sonarr API error: 500'));

      await expect(getSonarrRootFolder()).rejects.toThrow();
    });
  });

  describe('getSonarrAnimeList()', () => {
    it('should get anime list from Sonarr', async () => {
      mockGetSettings.mockResolvedValue({
        sonarrUrl: 'http://localhost:8989',
        sonarrApiKey: 'test-api-key',
        malClientId: '',
        malClientSecret: '',
        malRedirectUri: '',
        tvdbApiKey: '',
      });

      const mockSeries = [
        {
          id: 1,
          title: 'Attack on Titan',
          tvdbId: 267440,
          monitored: true,
          seasons: [],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSeries,
      } as Response);

      const result = await getSonarrAnimeList();

      expect(result).toEqual(mockSeries);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8989/api/v3/series',
        {
          headers: {
            'X-Api-Key': 'test-api-key',
          },
        }
      );
    });

    it('should throw if Sonarr not configured', async () => {
      mockGetSettings.mockResolvedValue({
        sonarrUrl: '',
        sonarrApiKey: '',
        malClientId: '',
        malClientSecret: '',
        malRedirectUri: '',
        tvdbApiKey: '',
      });

      await expect(getSonarrAnimeList()).rejects.toThrow(
        'Sonarr is not configured'
      );
    });
  });

  describe('getTvdbIds()', () => {
    it('should search TVDB and return IDs', async () => {
      const animeList = ['Attack on Titan'];
      const tvdbApiKey = 'test-tvdb-key';

      // Mock tvdbLogin - it's called by getTvdbIds
      mockCache.getOrSet.mockImplementation(async (_key, fetchFn) => {
        return await fetchFn();
      });

      // Mock token fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { token: 'test-bearer-token' } }),
        } as Response)
        // Mock search results
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                tvdb_id: '267440',
                name: 'Attack on Titan',
                year: '2013',
              },
            ],
          }),
        } as Response);

      const result = await getTvdbIds(animeList, tvdbApiKey);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Attack on Titan',
        tvdb_id: '267440',
      });
    });

    it('should throw if TVDB API key not provided', async () => {
      await expect(getTvdbIds(['test'], undefined)).rejects.toThrow(
        'TVDB API key is required'
      );
    });

    it('should return empty array for empty anime list', async () => {
      const result = await getTvdbIds([], 'test-key');
      expect(result).toEqual([]);
    });
  });
});
