import {
  loadUserPreferences,
  filterAnimeByPreferences,
  getUnsyncedAnime,
} from '@/services/preferencesService';

// Mock Prisma for tests
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    userPreferences: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = require('@/lib/prisma').default;

describe('Preferences Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadUserPreferences()', () => {
    it('should return preferences with defaults', async () => {
      const mockPrefs = {
        id: 1,
        username: 'testuser',
        syncWatching: true,
        syncCompleted: false,
        syncOnHold: false,
        syncDropped: false,
        syncPlanToWatch: true,
        searchForMissingEpisodes: false,
        enableSmartDuplicateDetection: true,
        fuzzyMatchThreshold: 85,
        conflictResolution: 'skip',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPrefs);

      const result = await loadUserPreferences('testuser');

      expect(result).toHaveProperty('syncWatching', true);
      expect(result).toHaveProperty('syncCompleted', false);
      expect(mockPrisma.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return defaults if user preferences not found', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null);

      const result = await loadUserPreferences('nonexistent');

      expect(result.syncWatching).toBe(true);
      expect(result.syncCompleted).toBe(false);
      expect(result.fuzzyMatchThreshold).toBe(85);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.userPreferences.findUnique.mockRejectedValue(
        new Error('Database connection error')
      );

      await expect(loadUserPreferences('testuser')).rejects.toThrow('Database connection error');
    });
  });

  describe('filterAnimeByPreferences()', () => {
    const mockAnimeList = [
      { id: 1, title: 'Anime 1', status: 'watching' },
      { id: 2, title: 'Anime 2', status: 'completed' },
      { id: 3, title: 'Anime 3', status: 'on_hold' },
      { id: 4, title: 'Anime 4', status: 'plan_to_watch' },
      { id: 5, title: 'Anime 5', status: 'dropped' },
    ];

    it('should filter watching anime only', () => {
      const prefs = {
        syncWatching: true,
        syncCompleted: false,
        syncOnHold: false,
        syncDropped: false,
        syncPlanToWatch: false,
      };

      const result = filterAnimeByPreferences(mockAnimeList, prefs as any);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('watching');
    });

    it('should filter multiple statuses', () => {
      const prefs = {
        syncWatching: true,
        syncCompleted: true,
        syncOnHold: false,
        syncDropped: false,
        syncPlanToWatch: true,
      };

      const result = filterAnimeByPreferences(mockAnimeList, prefs as any);

      expect(result).toHaveLength(3);
      expect(result.map(a => a.status)).toContain('watching');
      expect(result.map(a => a.status)).toContain('completed');
      expect(result.map(a => a.status)).toContain('plan_to_watch');
    });

    it('should return empty array if no statuses enabled', () => {
      const prefs = {
        syncWatching: false,
        syncCompleted: false,
        syncOnHold: false,
        syncDropped: false,
        syncPlanToWatch: false,
      };

      const result = filterAnimeByPreferences(mockAnimeList, prefs as any);

      expect(result).toHaveLength(0);
    });

    it('should return all anime if all statuses enabled', () => {
      const prefs = {
        syncWatching: true,
        syncCompleted: true,
        syncOnHold: true,
        syncDropped: true,
        syncPlanToWatch: true,
      };

      const result = filterAnimeByPreferences(mockAnimeList, prefs as any);

      expect(result).toHaveLength(5);
    });
  });

  describe('getUnsyncedAnime()', () => {
    const mockAnimeList = [
      { id: 1, title: 'Anime 1', status: 'watching' },
      { id: 2, title: 'Anime 2', status: 'completed' },
      { id: 3, title: 'Anime 3', status: 'on_hold' },
    ];

    it('should return anime that should NOT be synced', () => {
      const prefs = {
        syncWatching: true,
        syncCompleted: false,
        syncOnHold: false,
        syncDropped: false,
        syncPlanToWatch: false,
      };

      const result = getUnsyncedAnime(mockAnimeList, prefs as any);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.status)).not.toContain('watching');
    });

    it('should return empty if all statuses enabled', () => {
      const prefs = {
        syncWatching: true,
        syncCompleted: true,
        syncOnHold: true,
        syncDropped: true,
        syncPlanToWatch: true,
      };

      const result = getUnsyncedAnime(mockAnimeList, prefs as any);

      expect(result).toHaveLength(0);
    });
  });
});
