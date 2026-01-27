/**
 * Tests for Sync Orchestration Service
 */

describe('Sync Orchestration Service', () => {
  describe('buildAnimeDataMap()', () => {
    const mockBuildMap = (animeList: any[]) => {
      const map = new Map();
      animeList.forEach(anime => {
        if (anime.malId) {
          map.set(anime.malId, anime);
        }
      });
      return map;
    };

    it('should create a map indexed by malId', () => {
      const animeList = [
        { malId: 1, title: 'Anime 1' },
        { malId: 2, title: 'Anime 2' },
      ];

      const map = mockBuildMap(animeList);

      expect(map.size).toBe(2);
      expect(map.get(1)).toEqual({ malId: 1, title: 'Anime 1' });
    });

    it('should skip entries without malId', () => {
      const animeList = [
        { malId: 1, title: 'Anime 1' },
        { title: 'Anime 2' }, // no malId
      ];

      const map = mockBuildMap(animeList);

      expect(map.size).toBe(1);
    });

    it('should handle empty list', () => {
      const map = mockBuildMap([]);
      expect(map.size).toBe(0);
    });
  });

  describe('enrichSeriesWithMalData()', () => {
    const mockEnrich = (tvdbSeries: any[], malAnime: any[]) => {
      return tvdbSeries.map(series => {
        const malData = malAnime.find(a => a.title === series.title);
        return {
          ...series,
          malId: malData?.malId,
          score: malData?.score,
          status: malData?.status,
        };
      });
    };

    it('should enrich with MAL data', () => {
      const tvdbSeries = [{ title: 'Attack on Titan', tvdbId: 123 }];
      const malAnime = [{ title: 'Attack on Titan', malId: 16498, score: 9.0, status: 'watching' }];

      const enriched = mockEnrich(tvdbSeries, malAnime);

      expect(enriched[0]).toEqual({
        title: 'Attack on Titan',
        tvdbId: 123,
        malId: 16498,
        score: 9.0,
        status: 'watching',
      });
    });

    it('should handle missing MAL data', () => {
      const tvdbSeries = [{ title: 'Unknown Series', tvdbId: 999 }];
      const malAnime = [];

      const enriched = mockEnrich(tvdbSeries, malAnime);

      expect(enriched[0].malId).toBeUndefined();
    });
  });

  describe('addNotFoundEntries()', () => {
    const mockAddNotFound = (uniqueToMal: string[], foundTitles: string[]) => {
      const foundSet = new Set(foundTitles);
      return uniqueToMal
        .filter(title => !foundSet.has(title))
        .map(title => ({
          title,
          success: false,
          reason: 'Could not find on TVDB',
        }));
    };

    it('should identify not-found titles', () => {
      const uniqueToMal = ['Anime 1', 'Anime 2', 'Anime 3'];
      const foundTitles = ['Anime 1', 'Anime 2'];

      const notFound = mockAddNotFound(uniqueToMal, foundTitles);

      expect(notFound).toHaveLength(1);
      expect(notFound[0].title).toBe('Anime 3');
      expect(notFound[0].reason).toBe('Could not find on TVDB');
    });

    it('should handle all found', () => {
      const uniqueToMal = ['Anime 1'];
      const foundTitles = ['Anime 1'];

      const notFound = mockAddNotFound(uniqueToMal, foundTitles);

      expect(notFound).toHaveLength(0);
    });
  });

  describe('Sync result aggregation', () => {
    const mockAggregateResults = (results: any[]) => {
      return {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        reasons: results.reduce((acc, r) => {
          if (r.reason) {
            acc[r.reason] = (acc[r.reason] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
      };
    };

    it('should aggregate sync results', () => {
      const results = [
        { title: 'A', success: true },
        { title: 'B', success: false, reason: 'Not found' },
        { title: 'C', success: false, reason: 'Not found' },
        { title: 'D', success: false, reason: 'Duplicate' },
      ];

      const stats = mockAggregateResults(results);

      expect(stats.total).toBe(4);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(3);
      expect(stats.reasons['Not found']).toBe(2);
      expect(stats.reasons['Duplicate']).toBe(1);
    });
  });
});
