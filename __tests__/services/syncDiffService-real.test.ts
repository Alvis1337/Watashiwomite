/**
 * Real tests for services/syncDiffService.ts
 */

import {
  prepareSonarrData,
  findUniqueToMal,
  findUniqueToSonarr,
  calculateSyncDiff,
} from '@/services/syncDiffService';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    animeList: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/services/stringMatchingService');

import { findClosestMatch, levenshtein, normalizeTitle } from '@/services/stringMatchingService';

const mockFindClosestMatch = findClosestMatch as jest.MockedFunction<typeof findClosestMatch>;
const mockLevenshtein = levenshtein as jest.MockedFunction<typeof levenshtein>;
const mockNormalizeTitle = normalizeTitle as jest.MockedFunction<typeof normalizeTitle>;

describe('Sync Diff Service - REAL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNormalizeTitle.mockImplementation((title) => title.toLowerCase().replace(/[^a-z0-9]/g, ''));
  });

  describe('prepareSonarrData()', () => {
    it('should prepare Sonarr series with titles', () => {
      const sonarrSeries = [
        {
          id: 1,
          title: 'Attack on Titan',
          alternateTitles: [
            { title: 'Shingeki no Kyojin' },
            { title: 'AoT' },
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
        titles: ['attack on titan', 'shingeki no kyojin', 'aot'],
      });
      expect(result[1]).toEqual({
        id: 2,
        titles: ['one piece'],
      });
    });

    it('should handle alternate titles as strings', () => {
      const sonarrSeries = [
        {
          id: 1,
          title: 'Naruto',
          alternateTitles: ['ナルト', 'Naruto Shippuden'],
        },
      ];

      const result = prepareSonarrData(sonarrSeries);

      expect(result[0].titles).toContain('naruto');
    });

    it('should filter out null/invalid alternate titles', () => {
      const sonarrSeries = [
        {
          id: 1,
          title: 'Test',
          alternateTitles: [
            { title: 'Valid' },
            null,
            { notTitle: 'Invalid' },
            { title: null },
          ],
        },
      ];

      const result = prepareSonarrData(sonarrSeries);

      expect(result[0].titles).toEqual(['test', 'valid']);
    });

    it('should handle missing alternateTitles', () => {
      const sonarrSeries = [
        {
          id: 1,
          title: 'Test',
        },
      ];

      const result = prepareSonarrData(sonarrSeries);

      expect(result[0].titles).toEqual(['test']);
    });
  });

  describe('findUniqueToMal()', () => {
    it('should find titles unique to MAL', () => {
      const malTitles = ['Attack on Titan', 'Death Note', 'Code Geass'];
      const sonarrTitles = new Set(['Attack on Titan', 'Death Note']);

      mockFindClosestMatch.mockImplementation((title, list) => {
        return list.find((t) => t.toLowerCase() === title.toLowerCase()) || null;
      });

      mockLevenshtein.mockImplementation((a, b) => {
        return a === b ? 0 : 10;
      });

      const result = findUniqueToMal(malTitles, sonarrTitles);

      expect(result).toContain('Code Geass');
      expect(result).not.toContain('Attack on Titan');
    });

    it('should use custom threshold', () => {
      const malTitles = ['Test'];
      const sonarrTitles = new Set(['Test2']);

      mockFindClosestMatch.mockReturnValue('Test2');
      mockLevenshtein.mockReturnValue(3);

      const resultStrict = findUniqueToMal(malTitles, sonarrTitles, 2);
      expect(resultStrict).toContain('Test');

      mockLevenshtein.mockReturnValue(3);
      const resultLenient = findUniqueToMal(malTitles, sonarrTitles, 5);
      expect(resultLenient).toHaveLength(0);
    });
  });

  describe('findUniqueToSonarr()', () => {
    it('should find titles unique to Sonarr', () => {
      const sonarrTitles = new Set(['Attack on Titan', 'Death Note', 'Bleach']);
      const malTitles = ['Attack on Titan', 'Death Note'];

      mockFindClosestMatch.mockImplementation((title, list) => {
        return list.find((t) => t.toLowerCase() === title.toLowerCase()) || null;
      });

      mockLevenshtein.mockImplementation((a, b) => {
        return a === b ? 0 : 10;
      });

      const result = findUniqueToSonarr(sonarrTitles, malTitles);

      expect(result).toContain('Bleach');
      expect(result).not.toContain('Attack on Titan');
    });
  });

  describe('calculateSyncDiff()', () => {
    it('should calculate diff between MAL and Sonarr', async () => {
      const malAnime = [
        { node: { id: 1, title: 'Attack on Titan' } },
        { node: { id: 2, title: 'Death Note' } },
        { node: { id: 3, title: 'Code Geass' } },
      ];

      const sonarrSeries = [
        { id: 1, title: 'Attack on Titan', alternateTitles: [] },
        { id: 2, title: 'Death Note', alternateTitles: [] },
      ];

      mockFindClosestMatch.mockImplementation((title, list) => {
        return list.find((t) => t.toLowerCase() === title.toLowerCase()) || null;
      });

      mockLevenshtein.mockImplementation((a, b) => {
        return a === b ? 0 : 10;
      });

      const result = await calculateSyncDiff(malAnime, sonarrSeries);

      expect(result.uniqueToMal).toContain('Code Geass');
      expect(result.uniqueToSonarr).toHaveLength(0);
      expect(result.inBoth).toContain('attack on titan');
      expect(result.inBoth).toContain('death note');
    });

    it('should find titles in both lists', async () => {
      const malAnime = [
        { node: { id: 1, title: 'Naruto' } },
      ];

      const sonarrSeries = [
        { id: 1, title: 'Naruto', alternateTitles: [] },
      ];

      mockFindClosestMatch.mockReturnValue('naruto');
      mockLevenshtein.mockReturnValue(0);

      const result = await calculateSyncDiff(malAnime, sonarrSeries);

      expect(result.inBoth).toContain('naruto');
      expect(result.uniqueToMal).toHaveLength(0);
      expect(result.uniqueToSonarr).toHaveLength(0);
    });
  });
});
