/**
 * REAL tests for batchActions.ts
 * These import and execute actual functions with mocked dependencies
 */

import {
  refreshMetadataForSeries,
  searchForNewlyAddedSeries,
  backupCorrelationDatabase,
  executeAfterSyncActions,
} from '@/utils/batchActions';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    animeList: {
      findUnique: jest.fn(),
    },
  },
}));

global.fetch = jest.fn() as jest.Mock;

describe('Batch Actions - REAL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('refreshMetadataForSeries()', () => {
    it('should return success with 0 count for empty array', async () => {
      const result = await refreshMetadataForSeries([], 'api-key', 'http://localhost');
      
      expect(result).toEqual({ success: true, count: 0 });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should successfully refresh metadata', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await refreshMetadataForSeries([1, 2, 3], 'api-key', 'http://localhost');

      expect(result).toEqual({ success: true, count: 3 });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost/api/v3/command',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': 'api-key',
          },
          body: JSON.stringify({
            name: 'RefreshSeries',
            seriesIds: [1, 2, 3],
          }),
        }
      );
    });

    it('should handle API error response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('API Error'),
      });

      const result = await refreshMetadataForSeries([1], 'api-key', 'http://localhost');

      expect(result).toEqual({ success: false, count: 0 });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BatchActions] Failed to queue metadata refresh:',
        'API Error'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle network error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await refreshMetadataForSeries([1], 'api-key', 'http://localhost');

      expect(result).toEqual({ success: false, count: 0 });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BatchActions] Error refreshing metadata:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('searchForNewlyAddedSeries()', () => {
    it('should return success with 0 count for empty array', async () => {
      const result = await searchForNewlyAddedSeries([], 'api-key', 'http://localhost');

      expect(result).toEqual({ success: true, count: 0 });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should successfully search for episodes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await searchForNewlyAddedSeries([1, 2], 'api-key', 'http://localhost');

      expect(result).toEqual({ success: true, count: 2 });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost/api/v3/command',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': 'api-key',
          },
          body: JSON.stringify({
            name: 'SeriesSearch',
            seriesIds: [1, 2],
          }),
        }
      );
    });

    it('should handle API error response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('Search failed'),
      });

      const result = await searchForNewlyAddedSeries([1], 'api-key', 'http://localhost');

      expect(result).toEqual({ success: false, count: 0 });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BatchActions] Failed to queue episode search:',
        'Search failed'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle network error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Error'));

      const result = await searchForNewlyAddedSeries([1], 'api-key', 'http://localhost');

      expect(result).toEqual({ success: false, count: 0 });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BatchActions] Error searching for episodes:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('backupCorrelationDatabase()', () => {
    const mockAnimeList = {
      username: 'testuser',
      anime: [
        { malId: 1, title: 'Naruto' },
        { malId: 2, title: 'Bleach' },
      ],
      sonarrSeries: [
        { id: 1, title: 'Naruto', tvdbId: 123, malId: 1, path: '/anime/naruto', monitored: true },
      ],
    };

    it('should successfully backup database', async () => {
      const prisma = require('@/lib/prisma').default;
      prisma.animeList.findUnique.mockResolvedValue(mockAnimeList);

      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const result = await backupCorrelationDatabase('testuser');

      expect(result.success).toBe(true);
      expect(result.filePath).toMatch(/correlation-backup-testuser-\d+\.json/);
      expect(prisma.animeList.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        include: {
          anime: true,
          sonarrSeries: {
            select: {
              id: true,
              title: true,
              tvdbId: true,
              malId: true,
              path: true,
              monitored: true,
            },
          },
        },
      });

      const writeCall = writeFileSyncSpy.mock.calls[0];
      expect(writeCall[0]).toMatch(/backups\/correlation-backup-testuser/);
      
      const backupData = JSON.parse(writeCall[1] as string);
      expect(backupData).toHaveProperty('username', 'testuser');
      expect(backupData).toHaveProperty('backedUpAt');
      expect(backupData).toHaveProperty('animeCount', 2);
      expect(backupData).toHaveProperty('sonarrSeriesCount', 1);
      expect(backupData).toHaveProperty('anime');
      expect(backupData).toHaveProperty('sonarrSeries');

      writeFileSyncSpy.mockRestore();
      existsSyncSpy.mockRestore();
    });

    it('should return failure if anime list not found', async () => {
      const prisma = require('@/lib/prisma').default;
      prisma.animeList.findUnique.mockResolvedValue(null);

      const result = await backupCorrelationDatabase('nonexistent');

      expect(result).toEqual({ success: false });
    });

    it('should handle database error', async () => {
      const prisma = require('@/lib/prisma').default;
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      prisma.animeList.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await backupCorrelationDatabase('testuser');

      expect(result).toEqual({ success: false });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BatchActions] Error backing up database:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should create backup directory if it does not exist', async () => {
      const prisma = require('@/lib/prisma').default;
      prisma.animeList.findUnique.mockResolvedValue(mockAnimeList);

      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation();

      const result = await backupCorrelationDatabase('testuser');

      expect(result.success).toBe(true);
      expect(mkdirSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('backups'),
        { recursive: true }
      );

      writeFileSyncSpy.mockRestore();
      existsSyncSpy.mockRestore();
      mkdirSyncSpy.mockRestore();
    });

    it('should handle directory creation error', async () => {
      const prisma = require('@/lib/prisma').default;
      prisma.animeList.findUnique.mockResolvedValue(mockAnimeList);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await backupCorrelationDatabase('testuser');

      expect(result.success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BatchActions] Failed to create backup directory:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      writeFileSyncSpy.mockRestore();
      existsSyncSpy.mockRestore();
      mkdirSyncSpy.mockRestore();
    });
  });

  describe('executeAfterSyncActions()', () => {
    it('should execute all enabled actions', async () => {
      const prisma = require('@/lib/prisma').default;
      prisma.animeList.findUnique.mockResolvedValue({
        username: 'testuser',
        anime: [],
        sonarrSeries: [],
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const preferences = {
        afterSyncRefreshMetadata: true,
        afterSyncSearchMissing: true,
        afterSyncBackupDatabase: true,
      };

      await executeAfterSyncActions(
        preferences,
        [1, 2],
        'testuser',
        'api-key',
        'http://localhost'
      );

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(prisma.animeList.findUnique).toHaveBeenCalled();

      writeFileSyncSpy.mockRestore();
      existsSyncSpy.mockRestore();
    });

    it('should skip disabled actions', async () => {
      const preferences = {
        afterSyncRefreshMetadata: false,
        afterSyncSearchMissing: false,
        afterSyncBackupDatabase: false,
      };

      await executeAfterSyncActions(
        preferences,
        [1, 2],
        'testuser',
        'api-key',
        'http://localhost'
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle individual action failures gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const preferences = {
        afterSyncRefreshMetadata: true,
        afterSyncSearchMissing: true,
        afterSyncBackupDatabase: false,
      };

      await executeAfterSyncActions(
        preferences,
        [1],
        'testuser',
        'api-key',
        'http://localhost'
      );

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should execute only metadata refresh when enabled', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const preferences = {
        afterSyncRefreshMetadata: true,
        afterSyncSearchMissing: false,
        afterSyncBackupDatabase: false,
      };

      await executeAfterSyncActions(
        preferences,
        [1, 2, 3],
        'testuser',
        'api-key',
        'http://localhost'
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost/api/v3/command',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'RefreshSeries',
            seriesIds: [1, 2, 3],
          }),
        })
      );
    });

    it('should execute only search when enabled', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const preferences = {
        afterSyncRefreshMetadata: false,
        afterSyncSearchMissing: true,
        afterSyncBackupDatabase: false,
      };

      await executeAfterSyncActions(
        preferences,
        [1],
        'testuser',
        'api-key',
        'http://localhost'
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost/api/v3/command',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'SeriesSearch',
            seriesIds: [1],
          }),
        })
      );
    });

    it('should execute only backup when enabled', async () => {
      const prisma = require('@/lib/prisma').default;
      prisma.animeList.findUnique.mockResolvedValue({
        username: 'testuser',
        anime: [],
        sonarrSeries: [],
      });

      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const preferences = {
        afterSyncRefreshMetadata: false,
        afterSyncSearchMissing: false,
        afterSyncBackupDatabase: true,
      };

      await executeAfterSyncActions(
        preferences,
        [1],
        'testuser',
        'api-key',
        'http://localhost'
      );

      expect(global.fetch).not.toHaveBeenCalled();
      expect(prisma.animeList.findUnique).toHaveBeenCalled();

      writeFileSyncSpy.mockRestore();
      existsSyncSpy.mockRestore();
    });
  });
});
