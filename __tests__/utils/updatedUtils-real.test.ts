/**
 * Real tests for utils/updatedUtils.ts
 * Tests addAnimeToSonarr function
 */

jest.mock('@/lib/settings');

import { addAnimeToSonarr } from '@/utils/updatedUtils';
import { getSettings } from '@/lib/settings';

const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('UpdatedUtils - REAL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSettings.mockResolvedValue({
      sonarrUrl: 'http://localhost:8989',
      sonarrApiKey: 'test-api-key',
      tvdbApiKey: 'test-tvdb-key',
    });
  });

  describe('addAnimeToSonarr()', () => {
    it('should throw error when Sonarr API key not configured', async () => {
      mockGetSettings.mockResolvedValue({
        sonarrUrl: 'http://localhost:8989',
        sonarrApiKey: '',
        tvdbApiKey: 'test-tvdb-key',
      });

      const animeSeries = [{ title: 'Test Anime', tvdbId: '12345' }];

      await expect(addAnimeToSonarr(animeSeries, '/anime')).rejects.toThrow(
        'Sonarr API key is not configured'
      );
    });

    it('should add anime series successfully', async () => {
      // Mock existing series fetch (empty)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      // Mock add series POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      } as Response);

      const animeSeries = [{ title: 'Naruto', tvdbId: '78752' }];
      const results = await addAnimeToSonarr(animeSeries, '/anime', true);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].title).toBe('Naruto');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8989/api/v3/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'test-api-key',
        },
        body: expect.stringContaining('"title":"Naruto"'),
      });
    });

    it('should skip anime already in Sonarr', async () => {
      // Mock existing series fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ tvdbId: '78752' }],
      } as Response);

      const animeSeries = [{ title: 'Naruto', tvdbId: '78752' }];
      const results = await addAnimeToSonarr(animeSeries, '/anime');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('Already exists in Sonarr');

      // Should only fetch existing series, not try to add
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle duplicate error from Sonarr', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => [{ errorMessage: 'Series already been added' }],
      } as Response);

      const animeSeries = [{ title: 'Naruto', tvdbId: '78752' }];
      const results = await addAnimeToSonarr(animeSeries, '/anime');

      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('Already exists in Sonarr');
    });

    it('should handle TVDB not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => [{ errorMessage: 'Could not find series on TVDB' }],
      } as Response);

      const animeSeries = [{ title: 'Unknown Anime', tvdbId: '99999' }];
      const results = await addAnimeToSonarr(animeSeries, '/anime');

      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('Could not find on TVDB');
    });

    it('should handle network errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const animeSeries = [{ title: 'Naruto', tvdbId: '78752' }];
      const results = await addAnimeToSonarr(animeSeries, '/anime');

      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      mockFetch.mockRejectedValueOnce('String error');

      const animeSeries = [{ title: 'Naruto', tvdbId: '78752' }];
      const results = await addAnimeToSonarr(animeSeries, '/anime');

      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('Network error');
    });

    it('should process multiple anime series', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      // First series: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      } as Response);

      // Second series: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 2 }),
      } as Response);

      const animeSeries = [
        { title: 'Naruto', tvdbId: '78752' },
        { title: 'Bleach', tvdbId: '74796' },
      ];
      const results = await addAnimeToSonarr(animeSeries, '/anime');

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should continue processing after one failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      // First series: fail
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => [{ errorMessage: 'Error' }],
      } as Response);

      // Second series: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 2 }),
      } as Response);

      const animeSeries = [
        { title: 'Bad Anime', tvdbId: '11111' },
        { title: 'Good Anime', tvdbId: '22222' },
      ];
      const results = await addAnimeToSonarr(animeSeries, '/anime');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });

    it('should include searchForMissingEpisodes in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      } as Response);

      const animeSeries = [{ title: 'Naruto', tvdbId: '78752' }];
      await addAnimeToSonarr(animeSeries, '/anime', true);

      const postCall = mockFetch.mock.calls[1];
      const body = JSON.parse(postCall[1]?.body as string);
      
      expect(body.addOptions.searchForMissingEpisodes).toBe(true);
    });

    it('should default searchForMissingEpisodes to false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      } as Response);

      const animeSeries = [{ title: 'Naruto', tvdbId: '78752' }];
      await addAnimeToSonarr(animeSeries, '/anime');

      const postCall = mockFetch.mock.calls[1];
      const body = JSON.parse(postCall[1]?.body as string);
      
      expect(body.addOptions.searchForMissingEpisodes).toBe(false);
    });

    it('should handle fetch existing series error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      } as Response);

      const animeSeries = [{ title: 'Naruto', tvdbId: '78752' }];
      const results = await addAnimeToSonarr(animeSeries, '/anime');

      // Should still try to add even if existing series fetch fails
      expect(results[0].success).toBe(true);
    });

    it('should use correct Sonarr request format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      } as Response);

      const animeSeries = [{ title: 'Test Anime', tvdbId: '12345' }];
      await addAnimeToSonarr(animeSeries, '/media/anime', true);

      const postCall = mockFetch.mock.calls[1];
      const body = JSON.parse(postCall[1]?.body as string);
      
      expect(body).toMatchObject({
        tvdbId: 12345,
        title: 'Test Anime',
        qualityProfileId: 1,
        seriesType: 'standard',
        seasonFolder: true,
        monitored: true,
        rootFolderPath: '/media/anime',
        addOptions: {
          searchForMissingEpisodes: true,
        },
      });
    });
  });
});
