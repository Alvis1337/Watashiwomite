import { getUsernameFromToken, getMALAnimeList } from '@/utils/mal';
import type { MALUser, MALAnimeListResponse } from '@/types/external';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    anime: {
      upsert: jest.fn(),
    },
    animeList: {
      connectOrCreate: jest.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

describe('MAL Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUsernameFromToken', () => {
    it('should fetch username from MAL API', async () => {
      const mockUser: MALUser = { name: 'testuser', id: 123 };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const username = await getUsernameFromToken('test-token');

      expect(username).toBe('testuser');
      expect(global.fetch).toHaveBeenCalledWith(
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

    it('should throw error if token is missing', async () => {
      await expect(getUsernameFromToken('')).rejects.toThrow('Token is required');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if MAL API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(getUsernameFromToken('invalid-token')).rejects.toThrow(
        'Failed to fetch username from MyAnimeList'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(getUsernameFromToken('test-token')).rejects.toThrow(
        'Failed to fetch username from MyAnimeList'
      );
    });
  });

  describe('getMALAnimeList', () => {
    const mockAnimeData: MALAnimeListResponse = {
      data: [
        {
          node: {
            id: 1,
            title: 'Test Anime',
            main_picture: {
              medium: 'https://example.com/medium.jpg',
              large: 'https://example.com/large.jpg',
            },
          },
          list_status: {
            status: 'watching',
            score: 8,
            num_episodes_watched: 5,
            is_rewatching: false,
            updated_at: '2024-01-01T00:00:00Z',
            start_date: '2024-01-01',
          },
        },
      ],
    };

    beforeEach(() => {
      (prisma.anime.upsert as jest.Mock).mockResolvedValue({
        malId: 1,
        title: 'Test Anime',
      });
    });

    it('should fetch and save anime list from MAL', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('watching')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockAnimeData,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      });

      const result = await getMALAnimeList('test-token', 'testuser');

      expect(result).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(5); // 5 statuses
      expect(prisma.anime.upsert).toHaveBeenCalledWith({
        where: { malId: 1 },
        update: expect.objectContaining({
          title: 'Test Anime',
          status: 'watching',
          score: 8,
        }),
        create: expect.objectContaining({
          malId: 1,
          title: 'Test Anime',
          status: 'watching',
        }),
      });
    });

    it('should throw error if token is missing', async () => {
      await expect(getMALAnimeList('', 'testuser')).rejects.toThrow('MAL token is required');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if username is missing', async () => {
      await expect(getMALAnimeList('test-token', '')).rejects.toThrow('Username is required');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle MAL API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getMALAnimeList('test-token', 'testuser');

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(5); // Warns for each status
      consoleWarnSpy.mockRestore();
    });

    it('should handle individual anime save errors', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('watching')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockAnimeData,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      });

      (prisma.anime.upsert as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getMALAnimeList('test-token', 'testuser');

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle missing main_picture gracefully', async () => {
      const animeWithoutPicture = {
        data: [
          {
            node: {
              id: 2,
              title: 'No Picture Anime',
            },
            list_status: {
              status: 'completed',
              score: null,
              num_episodes_watched: null,
              is_rewatching: false,
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('completed')) {
          return Promise.resolve({
            ok: true,
            json: async () => animeWithoutPicture,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      });

      const result = await getMALAnimeList('test-token', 'testuser');

      expect(result).toHaveLength(1);
      expect(prisma.anime.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            mainPictureMedium: null,
            mainPictureLarge: null,
          }),
        })
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // getMALAnimeList catches errors and returns empty array on individual status failures
      // But a complete network failure should throw
      const result = await getMALAnimeList('test-token', 'testuser');

      // Network errors on individual statuses don't fail the whole operation
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid response data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'data' }),
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getMALAnimeList('test-token', 'testuser');

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(5);
      consoleWarnSpy.mockRestore();
    });

    it('should process multiple anime from multiple statuses', async () => {
      const multipleAnime = {
        data: [
          {
            node: { id: 1, title: 'Anime 1' },
            list_status: {
              status: 'watching',
              score: 8,
              num_episodes_watched: 5,
              is_rewatching: false,
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
          {
            node: { id: 2, title: 'Anime 2' },
            list_status: {
              status: 'watching',
              score: 9,
              num_episodes_watched: 10,
              is_rewatching: false,
              updated_at: '2024-01-02T00:00:00Z',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('watching') || url.includes('completed')) {
          return Promise.resolve({
            ok: true,
            json: async () => multipleAnime,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      });

      const result = await getMALAnimeList('test-token', 'testuser');

      expect(result).toHaveLength(4); // 2 anime from 2 statuses
      expect(prisma.anime.upsert).toHaveBeenCalledTimes(4);
    });
  });
});
