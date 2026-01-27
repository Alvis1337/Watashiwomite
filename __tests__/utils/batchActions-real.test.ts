/**
 * Real tests for utils/batchActions.ts
 */

import {
  refreshMetadataForSeries,
  searchForNewlyAddedSeries,
  backupCorrelationDatabase,
  executeAfterSyncActions,
} from '@/utils/batchActions';
import { writeFileSync } from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    animeList: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Batch Actions - REAL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshMetadataForSeries()', () => {
    it('should refresh metadata for series', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await refreshMetadataForSeries(
        [1, 2, 3],
        'test-api-key',
        'http://localhost:8989'
      );

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8989/api/v3/command',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': 'test-api-key',
          },
          body: JSON.stringify({
            name: 'RefreshSeries',
            seriesIds: [1, 2, 3],
          }),
        }
      );
    });

    it('should handle empty series list', async () => {
      const result = await refreshMetadataForSeries([], 'key', 'url');

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      } as Response);

      const result = await refreshMetadataForSeries([1], 'key', 'url');

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await refreshMetadataForSeries([1], 'key', 'url');

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
    });
  });

  describe('searchForNewlyAddedSeries()', () => {
    it('should search for newly added series', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await searchForNewlyAddedSeries(
        [1, 2],
        'test-api-key',
        'http://localhost:8989'
      );

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8989/api/v3/command',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle empty series list', async () => {
      const result = await searchForNewlyAddedSeries([], 'key', 'url');

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    it('should handle errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Error'));

      const result = await searchForNewlyAddedSeries([1], 'key', 'url');

      expect(result.success).toBe(false);
    });
  });

  describe('backupCorrelationDatabase()', () => {
    it('should backup database', async () => {
      mockPrisma.animeList.findMany.mockResolvedValue([
        {
          id: 1,
          malId: 123,
          tvdbId: 456,
          title: 'Test Anime',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await backupCorrelationDatabase();

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockPrisma.animeList.findMany.mockRejectedValue(new Error('DB error'));

      const result = await backupCorrelationDatabase();

      expect(result.success).toBe(false);
    });
  });

  describe('executeAfterSyncActions()', () => {
    it('should execute all after-sync actions', async () => {
      const seriesIds = [1, 2, 3];
      const config = {
        refreshMetadata: true,
        searchForEpisodes: true,
        backupDatabase: true,
      };

      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      mockPrisma.animeList.findMany.mockResolvedValue([]);

      const result = await executeAfterSyncActions(
        seriesIds,
        'key',
        'http://localhost:8989',
        config
      );

      expect(result.refreshed).toBe(3);
      expect(result.searched).toBe(3);
      expect(result.backed_up).toBe(true);
    });

    it('should skip actions based on config', async () => {
      const seriesIds = [1];
      const config = {
        refreshMetadata: false,
        searchForEpisodes: false,
        backupDatabase: false,
      };

      const result = await executeAfterSyncActions(seriesIds, 'key', 'url', config);

      expect(result.refreshed).toBe(0);
      expect(result.searched).toBe(0);
      expect(result.backed_up).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const seriesIds = [1];
      const config = {
        refreshMetadata: true,
        searchForEpisodes: true,
        backupDatabase: true,
      };

      mockFetch.mockRejectedValue(new Error('Network error'));
      mockPrisma.animeList.findMany.mockRejectedValue(new Error('DB error'));

      const result = await executeAfterSyncActions(seriesIds, 'key', 'url', config);

      expect(result.refreshed).toBe(0);
      expect(result.searched).toBe(0);
      expect(result.backed_up).toBe(false);
    });
  });
});
