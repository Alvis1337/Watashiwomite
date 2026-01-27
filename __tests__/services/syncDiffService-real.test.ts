/**
 * REAL tests for syncDiffService.ts
 * These import and execute actual functions with mocked dependencies
 */

import {
  prepareSonarrData,
  findUniqueToMal,
  findUniqueToSonarr,
  linkSonarrToMalIds,
  calculateSyncDiff,
  SonarrSeriesData,
} from '@/services/syncDiffService';
import * as stringMatchingService from '@/services/stringMatchingService';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    anime: {
      findFirst: jest.fn(),
    },
    sonarrSeries: {
      update: jest.fn(),
    },
  },
}));

jest.mock('@/services/stringMatchingService');

const mockNormalizeTitle = stringMatchingService.normalizeTitle as jest.MockedFunction<typeof stringMatchingService.normalizeTitle>;
const mockFindClosestMatch = stringMatchingService.findClosestMatch as jest.MockedFunction<typeof stringMatchingService.findClosestMatch>;
const mockLevenshtein = stringMatchingService.levenshtein as jest.MockedFunction<typeof stringMatchingService.levenshtein>;

describe('Sync Diff Service - REAL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNormalizeTitle.mockImplementation((title) => title.toLowerCase().replace(/[^a-z0-9]/g, ''));
    mockLevenshtein.mockImplementation((a, b) => {
      if (a === b) return 0;
      return Math.abs(a.length - b.length);
    });
  });

  describe('prepareSonarrData()', () => {
    it('should prepare Sonarr series data with titles', () => {
      const sonarrSeries = [
        {
          id: 1,
          title: 'Naruto',
          alternateTitles: [
            { title: 'Naruto Shippuden' },
            { title: 'Naruto: Hurricane Chronicles' },
          ],
        },
        {
          id: 2,
          title: 'One Piece',
          alternateTitles: [],
        },
      ];

      const result = prepareSonarrData(sonarrSeries);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        titles: ['naruto', 'naruto shippuden', 'naruto: hurricane chronicles'],
      });
      expect(result[1]).toEqual({
        id: 2,
        titles: ['one piece'],
      });
    });

    it('should handle null alternate titles', () => {
      const sonarrSeries = [
        {
          id: 1,
          title: 'Test Anime',
          alternateTitles: [
            { title: 'Valid Title' },
            null,
            { wrongKey: 'Invalid' },
          ],
        },
      ];

      const result = prepareSonarrData(sonarrSeries);

      expect(result[0].titles).toEqual(['test anime', 'valid title']);
    });

    it('should handle series without alternateTitles property', () => {
      const sonarrSeries = [
        {
          id: 1,
          title: 'Simple Anime',
        },
      ];

      const result = prepareSonarrData(sonarrSeries);

      expect(result[0].titles).toEqual(['simple anime']);
    });

    it('should handle non-array alternateTitles', () => {
      const sonarrSeries = [
        {
          id: 1,
          title: 'Test',
          alternateTitles: 'not an array' as any,
        },
      ];

      const result = prepareSonarrData(sonarrSeries);

      expect(result[0].titles).toEqual(['test']);
    });
  });

  describe('findUniqueToMal()', () => {
    it('should find titles unique to MAL', () => {
      const malTitles = ['Naruto', 'Bleach', 'One Piece'];
      const sonarrTitles = new Set(['naruto', 'one piece']);

      mockFindClosestMatch.mockImplementation((title, list) => {
        const normalized = title.toLowerCase();
        return list.find((t) => t === normalized) || null;
      });

      const result = findUniqueToMal(malTitles, sonarrTitles, 5);

      expect(result).toEqual(['Bleach']);
    });

    it('should include titles with high Levenshtein distance', () => {
      const malTitles = ['Attack on Titan'];
      const sonarrTitles = new Set(['shingeki no kyojin']);

      mockFindClosestMatch.mockReturnValue('shingeki no kyojin');
      mockLevenshtein.mockReturnValue(10);

      const result = findUniqueToMal(malTitles, sonarrTitles, 5);

      expect(result).toContain('Attack on Titan');
    });

    it('should exclude titles with low Levenshtein distance', () => {
      const malTitles = ['Naruto'];
      const sonarrTitles = new Set(['naruto']);

      mockFindClosestMatch.mockReturnValue('naruto');
      mockLevenshtein.mockReturnValue(0);

      const result = findUniqueToMal(malTitles, sonarrTitles, 5);

      expect(result).toEqual([]);
    });

    it('should handle empty MAL list', () => {
      const result = findUniqueToMal([], new Set(['naruto']), 5);
      expect(result).toEqual([]);
    });

    it('should handle empty Sonarr list', () => {
      mockFindClosestMatch.mockReturnValue(null);

      const result = findUniqueToMal(['Naruto'], new Set(), 5);

      expect(result).toEqual(['Naruto']);
    });
  });

  describe('findUniqueToSonarr()', () => {
    it('should find titles unique to Sonarr', () => {
      const sonarrTitles = new Set(['naruto', 'bleach', 'one piece']);
      const malTitles = ['Naruto', 'One Piece'];

      mockFindClosestMatch.mockImplementation((title, list) => {
        const normalized = title.toLowerCase();
        return list.find((t) => t.toLowerCase() === normalized) || null;
      });

      const result = findUniqueToSonarr(sonarrTitles, malTitles, 5);

      expect(result).toEqual(['bleach']);
    });

    it('should include titles with high Levenshtein distance', () => {
      const sonarrTitles = new Set(['shingeki no kyojin']);
      const malTitles = ['Attack on Titan'];

      mockFindClosestMatch.mockReturnValue('Attack on Titan');
      mockLevenshtein.mockReturnValue(10);

      const result = findUniqueToSonarr(sonarrTitles, malTitles, 5);

      expect(result).toContain('shingeki no kyojin');
    });

    it('should handle empty lists', () => {
      mockFindClosestMatch.mockReturnValue(null);

      const result = findUniqueToSonarr(new Set(['naruto']), [], 5);

      expect(result).toEqual(['naruto']);
    });
  });

  describe('linkSonarrToMalIds()', () => {
    it('should link Sonarr series to MAL IDs', async () => {
      const prisma = require('@/lib/prisma').default;

      const sonarrSeries: SonarrSeriesData[] = [
        { id: 1, titles: ['naruto', 'naruto shippuden'] },
        { id: 2, titles: ['one piece'] },
      ];
      const malTitles = ['Naruto', 'One Piece'];

      mockFindClosestMatch.mockImplementation((title, list) => {
        if (title.includes('naruto')) return 'Naruto';
        if (title.includes('one piece')) return 'One Piece';
        return null;
      });

      prisma.anime.findFirst
        .mockResolvedValueOnce({ malId: 20, title: 'Naruto' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ malId: 21, title: 'One Piece' });

      prisma.sonarrSeries.update.mockResolvedValue({});

      await linkSonarrToMalIds(sonarrSeries, malTitles);

      expect(prisma.sonarrSeries.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { malId: 20 },
      });
      expect(prisma.sonarrSeries.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { malId: 21 },
      });
    });

    it('should skip if no match found', async () => {
      const prisma = require('@/lib/prisma').default;

      const sonarrSeries: SonarrSeriesData[] = [{ id: 1, titles: ['naruto'] }];
      const malTitles = ['One Piece'];

      mockFindClosestMatch.mockReturnValue(null);

      await linkSonarrToMalIds(sonarrSeries, malTitles);

      expect(prisma.anime.findFirst).not.toHaveBeenCalled();
      expect(prisma.sonarrSeries.update).not.toHaveBeenCalled();
    });

    it('should skip if anime not found in database', async () => {
      const prisma = require('@/lib/prisma').default;

      const sonarrSeries: SonarrSeriesData[] = [{ id: 1, titles: ['naruto'] }];
      const malTitles = ['Naruto'];

      mockFindClosestMatch.mockReturnValue('Naruto');
      prisma.anime.findFirst.mockResolvedValue(null);

      await linkSonarrToMalIds(sonarrSeries, malTitles);

      expect(prisma.anime.findFirst).toHaveBeenCalledWith({
        where: { title: 'Naruto' },
      });
      expect(prisma.sonarrSeries.update).not.toHaveBeenCalled();
    });

    it('should handle empty lists', async () => {
      const prisma = require('@/lib/prisma').default;

      await linkSonarrToMalIds([], []);

      expect(prisma.anime.findFirst).not.toHaveBeenCalled();
      expect(prisma.sonarrSeries.update).not.toHaveBeenCalled();
    });
  });

  describe('calculateSyncDiff()', () => {
    it('should calculate complete sync diff', async () => {
      const prisma = require('@/lib/prisma').default;

      const malAnime = [
        { title: 'Naruto' },
        { title: 'Bleach' },
      ];
      const sonarrSeries = [
        {
          id: 1,
          title: 'Naruto',
          alternateTitles: [],
        },
      ];

      mockFindClosestMatch.mockImplementation((title, list) => {
        const normalized = title.toLowerCase();
        return list.find((t) => t.toLowerCase() === normalized) || null;
      });

      prisma.anime.findFirst.mockResolvedValue(null);

      const result = await calculateSyncDiff(malAnime, sonarrSeries, 5);

      expect(result).toHaveProperty('uniqueToMal');
      expect(result).toHaveProperty('uniqueToSonarr');
      expect(result).toHaveProperty('malTitles');
      expect(result).toHaveProperty('sonarrSeries');
      expect(result.malTitles).toEqual(['Naruto', 'Bleach']);
      expect(result.sonarrSeries).toHaveLength(1);
      expect(result.uniqueToMal).toContain('Bleach');
    });

    it('should handle empty lists', async () => {
      mockFindClosestMatch.mockReturnValue(null);

      const result = await calculateSyncDiff([], [], 5);

      expect(result.uniqueToMal).toEqual([]);
      expect(result.uniqueToSonarr).toEqual([]);
      expect(result.malTitles).toEqual([]);
      expect(result.sonarrSeries).toEqual([]);
    });

    it('should use custom fuzzy match threshold', async () => {
      const prisma = require('@/lib/prisma').default;

      const malAnime = [{ title: 'Test' }];
      const sonarrSeries = [];

      mockFindClosestMatch.mockReturnValue(null);
      prisma.anime.findFirst.mockResolvedValue(null);

      const result = await calculateSyncDiff(malAnime, sonarrSeries, 10);

      expect(result.uniqueToMal).toEqual(['Test']);
    });
  });
});
