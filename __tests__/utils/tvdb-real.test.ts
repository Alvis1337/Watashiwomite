import { tvdbLogin, getTvdbIds } from '@/utils/tvdb';
import { cache } from '@/lib/cache';
import type { TVDBLoginResponse, TVDBSearchResult } from '@/types/external';

jest.mock('@/lib/cache');

describe('TVDB Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    (cache.get as jest.Mock).mockReturnValue(null);
    (cache.set as jest.Mock).mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('tvdbLogin', () => {
    const mockLoginResponse: TVDBLoginResponse = {
      data: {
        token: 'test-tvdb-token',
      },
      status: 'success',
    };

    it('should authenticate with TVDB and return token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      });

      const result = await tvdbLogin('test-api-key');

      expect(result).toEqual(mockLoginResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api4.thetvdb.com/v4/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apikey: 'test-api-key' }),
      });
      expect(cache.set).toHaveBeenCalled();
    });

    it('should return cached token if available', async () => {
      (cache.get as jest.Mock).mockReturnValueOnce(mockLoginResponse);

      const result = await tvdbLogin('test-api-key');

      expect(result).toEqual(mockLoginResponse);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should throw error if API key is missing', async () => {
      await expect(tvdbLogin('')).rejects.toThrow('TVDB API key is required');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if TVDB login fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(tvdbLogin('invalid-key')).rejects.toThrow('Failed to authenticate with TVDB');
    });

    it('should throw error if response missing token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await expect(tvdbLogin('test-api-key')).rejects.toThrow('Failed to authenticate with TVDB');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(tvdbLogin('test-api-key')).rejects.toThrow('Failed to authenticate with TVDB');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getTvdbIds', () => {
    const mockLoginResponse: TVDBLoginResponse = {
      data: { token: 'test-token' },
      status: 'success',
    };

    const mockSearchResult: TVDBSearchResult = {
      data: [
        {
          id: 'series-12345',
          name: 'Test Anime',
          primary_type: 'series',
          primary_language: 'jpn',
          genres: ['Anime', 'Action'],
        },
      ],
      status: 'success',
    };

    beforeEach(() => {
      (cache.get as jest.Mock).mockReturnValue(null);
    });

    it('should fetch TVDB IDs for anime titles', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResult,
        });

      const result = await getTvdbIds(['Test Anime'], 'test-api-key');

      expect(result).toEqual([{ title: 'Test Anime', tvdbId: '12345' }]);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error if API key is missing', async () => {
      await expect(getTvdbIds(['Test'], undefined)).rejects.toThrow('TVDB API key is required');
    });

    it('should return empty array if anime list is empty', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getTvdbIds([], 'test-api-key');

      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle search failures gracefully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getTvdbIds(['Unknown Anime'], 'test-api-key');

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should filter null results from failed searches', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResult,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getTvdbIds(['Test Anime', 'Unknown Anime'], 'test-api-key');

      expect(result).toEqual([{ title: 'Test Anime', tvdbId: '12345' }]);
      consoleWarnSpy.mockRestore();
    });

    it('should prefer anime/animation series in Japanese or English', async () => {
      const searchWithMultiple: TVDBSearchResult = {
        data: [
          {
            id: 'series-999',
            name: 'Wrong One',
            primary_type: 'movie',
            primary_language: 'eng',
            genres: ['Action'],
          },
          {
            id: 'series-12345',
            name: 'Correct One',
            primary_type: 'series',
            primary_language: 'jpn',
            genres: ['Anime'],
          },
        ],
        status: 'success',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => searchWithMultiple,
        });

      const result = await getTvdbIds(['Test Anime'], 'test-api-key');

      expect(result[0].tvdbId).toBe('12345');
    });

    it('should fallback to first available series', async () => {
      const searchWithNoAnime: TVDBSearchResult = {
        data: [
          {
            id: 'series-999',
            name: 'Generic Series',
            primary_type: 'series',
            primary_language: 'eng',
            genres: ['Drama'],
          },
        ],
        status: 'success',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => searchWithNoAnime,
        });

      const result = await getTvdbIds(['Test Anime'], 'test-api-key');

      expect(result[0].tvdbId).toBe('999');
    });

    it('should strip series- and movie- prefixes from IDs', async () => {
      const searchWithMovie: TVDBSearchResult = {
        data: [
          {
            id: 'movie-12345',
            name: 'Test Movie',
            primary_type: 'series',
            primary_language: 'jpn',
          },
        ],
        status: 'success',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => searchWithMovie,
        });

      const result = await getTvdbIds(['Test Movie'], 'test-api-key');

      expect(result[0].tvdbId).toBe('12345');
    });

    it('should handle series with no matches found', async () => {
      const emptySearch: TVDBSearchResult = {
        data: [],
        status: 'success',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => emptySearch,
        });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getTvdbIds(['Nonexistent Anime'], 'test-api-key');

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('No series found for Nonexistent Anime');
      consoleWarnSpy.mockRestore();
    });

    it('should handle invalid search data', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ invalid: 'data' }),
        });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getTvdbIds(['Test Anime'], 'test-api-key');

      expect(result).toEqual([]);
      consoleWarnSpy.mockRestore();
    });

    it('should handle individual search errors', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })
        .mockRejectedValueOnce(new Error('Search failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getTvdbIds(['Test Anime'], 'test-api-key');

      expect(result).toEqual([]);
      consoleErrorSpy.mockRestore();
    });

    it('should throw error if login fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await expect(getTvdbIds(['Test'], 'test-api-key')).rejects.toThrow('Failed to get TVDB IDs');
    });

    it('should handle non-array anime list', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getTvdbIds(null as any, 'test-api-key');

      expect(result).toEqual([]);
      consoleWarnSpy.mockRestore();
    });

    it('should process multiple anime in parallel', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'series-1',
                name: 'Anime 1',
                primary_type: 'series',
                primary_language: 'jpn',
                genres: ['Anime'],
              },
            ],
            status: 'success',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'series-2',
                name: 'Anime 2',
                primary_type: 'series',
                primary_language: 'jpn',
                genres: ['Anime'],
              },
            ],
            status: 'success',
          }),
        });

      const result = await getTvdbIds(['Anime 1', 'Anime 2'], 'test-api-key');

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { title: 'Anime 1', tvdbId: '1' },
        { title: 'Anime 2', tvdbId: '2' },
      ]);
    });
  });
});
