import { prisma } from '@/lib/prisma';
import {
  logSyncHistory,
  getSyncHistory,
  cleanupOldSyncHistory,
  rollbackSync,
} from '@/utils/syncHistory';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    syncHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    userPreferences: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockPrisma = require('@/lib/prisma').default;

describe('Sync History Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logSyncHistory()', () => {
    it('should create a sync history record', async () => {
      const mockData = {
        username: 'testuser',
        addedAnime: [{ malId: 1, title: 'Anime 1' }],
        removedAnime: [],
        updatedAnime: [],
        success: true,
      };

      mockPrisma.syncHistory.create.mockResolvedValue({
        id: 1,
        ...mockData,
        summary: 'Added 1, Updated 0, Removed 0',
        createdAt: new Date(),
      });

      mockPrisma.userPreferences.findUnique.mockResolvedValue({
        maxHistoryEntries: 10,
      });

      mockPrisma.syncHistory.findMany.mockResolvedValue([]);

      await logSyncHistory(mockData);

      expect(mockPrisma.syncHistory.create).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockData = {
        username: 'testuser',
        addedAnime: [],
        removedAnime: [],
        updatedAnime: [],
        success: false,
        errorMessage: 'Test error',
      };

      mockPrisma.syncHistory.create.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(logSyncHistory(mockData)).resolves.not.toThrow();
    });
  });

  describe('getSyncHistory()', () => {
    it('should fetch sync history for a user', async () => {
      const mockHistories = [
        {
          id: 1,
          username: 'testuser',
          addedAnime: [],
          removedAnime: [],
          updatedAnime: [],
          summary: 'Added 0, Updated 0, Removed 0',
          success: true,
          syncedAt: new Date(),
        },
      ];

      mockPrisma.syncHistory.findMany.mockResolvedValue(mockHistories);

      const result = await getSyncHistory('testuser');

      expect(result).toEqual(mockHistories);
      expect(mockPrisma.syncHistory.findMany).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        orderBy: { syncedAt: 'desc' },
        take: 10,
      });
    });

    it('should return empty array if no history', async () => {
      mockPrisma.syncHistory.findMany.mockResolvedValue([]);

      const result = await getSyncHistory('newuser');

      expect(result).toEqual([]);
    });

    it('should limit results', async () => {
      mockPrisma.syncHistory.findMany.mockResolvedValue([]);

      await getSyncHistory('testuser', 5);

      expect(mockPrisma.syncHistory.findMany).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        orderBy: { syncedAt: 'desc' },
        take: 5,
      });
    });
  });

  describe('cleanupOldSyncHistory()', () => {
    it('should delete old entries beyond max limit', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue({
        maxHistoryEntries: 2,
      });

      mockPrisma.syncHistory.findMany.mockResolvedValue([
        { id: 3 },
        { id: 2 },
        { id: 1 },
      ]);

      mockPrisma.syncHistory.deleteMany.mockResolvedValue({ count: 1 });

      await cleanupOldSyncHistory('testuser');

      expect(mockPrisma.syncHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1],
          },
        },
      });
    });

    it('should handle missing preferences', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null);

      await expect(cleanupOldSyncHistory('testuser')).resolves.not.toThrow();
    });
  });

  describe('rollbackSync()', () => {
    it('should remove anime that were added', async () => {
      const mockHistory = {
        id: 1,
        username: 'testuser',
        addedAnime: [
          { malId: 1, title: 'Anime 1', sonarrId: 100 },
          { malId: 2, title: 'Anime 2', sonarrId: 101 },
        ],
        removedAnime: [],
        updatedAnime: [],
      };

      mockPrisma.syncHistory.findUnique.mockResolvedValue(mockHistory);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await rollbackSync(1, 'test-api-key', 'http://localhost:8989');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle missing sync history', async () => {
      mockPrisma.syncHistory.findUnique.mockResolvedValue(null);

      const result = await rollbackSync(999, 'test-api-key', 'http://localhost:8989');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Sync history not found');
    });

    it('should handle rollback errors', async () => {
      mockPrisma.syncHistory.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await rollbackSync(1, 'test-api-key', 'http://localhost:8989');

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });
  });
});
