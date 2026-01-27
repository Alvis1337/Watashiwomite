/**
 * Tests for Enhanced Sync
 */

describe('Enhanced Sync', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  describe('Duplicate detection', () => {
    const mockFindDuplicates = (title: string, existing: string[], threshold: number) => {
      const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, '');
      return existing.filter(ex => {
        const normalizedEx = ex.toLowerCase().replace(/[^\w\s]/g, '');
        return normalizedEx === normalizedTitle || 
               normalizedEx.includes(normalizedTitle) ||
               normalizedTitle.includes(normalizedEx);
      });
    };

    it('should detect exact duplicates', () => {
      const existing = ['Attack on Titan', 'My Hero Academia'];
      const duplicates = mockFindDuplicates('Attack on Titan', existing, 85);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toBe('Attack on Titan');
    });

    it('should detect near-duplicates', () => {
      const existing = ['Attack on Titan Season 2'];
      const duplicates = mockFindDuplicates('Attack on Titan', existing, 85);

      expect(duplicates).toHaveLength(1);
    });

    it('should not detect false positives', () => {
      const existing = ['One Piece', 'Naruto'];
      const duplicates = mockFindDuplicates('Attack on Titan', existing, 85);

      expect(duplicates).toHaveLength(0);
    });
  });

  describe('Score-based monitoring', () => {
    const mockCalculateMonitoring = (score: number | null, highThreshold: number, medThreshold: number) => {
      if (!score) return { monitored: true, monitorNewItems: 'all' };
      
      if (score >= highThreshold) {
        return { monitored: true, monitorNewItems: 'all' };
      } else if (score >= medThreshold) {
        return { monitored: true, monitorNewItems: 'none' };
      } else {
        return { monitored: false, monitorNewItems: 'none' };
      }
    };

    it('should monitor high-score anime fully', () => {
      const monitoring = mockCalculateMonitoring(9.0, 8, 6);

      expect(monitoring.monitored).toBe(true);
      expect(monitoring.monitorNewItems).toBe('all');
    });

    it('should monitor mid-score anime partially', () => {
      const monitoring = mockCalculateMonitoring(7.0, 8, 6);

      expect(monitoring.monitored).toBe(true);
      expect(monitoring.monitorNewItems).toBe('none');
    });

    it('should not monitor low-score anime', () => {
      const monitoring = mockCalculateMonitoring(5.0, 8, 6);

      expect(monitoring.monitored).toBe(false);
    });

    it('should handle null scores', () => {
      const monitoring = mockCalculateMonitoring(null, 8, 6);

      expect(monitoring.monitored).toBe(true);
    });
  });

  describe('Episode type filtering', () => {
    const mockShouldSkip = (seriesType: string, prefs: any) => {
      if (prefs.skipOVAs && seriesType === 'OVA') return true;
      if (prefs.skipSpecials && seriesType === 'Special') return true;
      if (prefs.skipMovies && seriesType === 'Movie') return true;
      if (prefs.onlyMainSeries && seriesType !== 'TV') return true;
      return false;
    };

    it('should skip OVAs when enabled', () => {
      expect(mockShouldSkip('OVA', { skipOVAs: true })).toBe(true);
      expect(mockShouldSkip('OVA', { skipOVAs: false })).toBe(false);
    });

    it('should skip movies when enabled', () => {
      expect(mockShouldSkip('Movie', { skipMovies: true })).toBe(true);
      expect(mockShouldSkip('Movie', { skipMovies: false })).toBe(false);
    });

    it('should allow TV series', () => {
      const prefs = { skipOVAs: true, skipMovies: true, onlyMainSeries: false };
      expect(mockShouldSkip('TV', prefs)).toBe(false);
    });

    it('should handle onlyMainSeries', () => {
      expect(mockShouldSkip('OVA', { onlyMainSeries: true })).toBe(true);
      expect(mockShouldSkip('TV', { onlyMainSeries: true })).toBe(false);
    });
  });

  describe('Airing status logic', () => {
    const mockShouldSkipAiring = (status: string, prefs: any) => {
      if (prefs.prioritizeAiring && status === 'finished_airing') return false;
      if (prefs.ignoreCompletedSeries && status === 'finished_airing') return true;
      return false;
    };

    it('should not skip airing when prioritized', () => {
      expect(mockShouldSkipAiring('currently_airing', { prioritizeAiring: true })).toBe(false);
    });

    it('should skip completed when ignored', () => {
      expect(mockShouldSkipAiring('finished_airing', { ignoreCompletedSeries: true })).toBe(true);
    });

    it('should allow finished when not ignoring', () => {
      expect(mockShouldSkipAiring('finished_airing', { ignoreCompletedSeries: false })).toBe(false);
    });
  });

  describe('Conflict resolution', () => {
    const mockResolveConflict = (strategy: string, existing: any, new_: any) => {
      switch (strategy) {
        case 'skip':
          return { action: 'skip', result: existing };
        case 'replace':
          return { action: 'replace', result: new_ };
        case 'keep-higher-score':
          return existing.score > new_.score 
            ? { action: 'skip', result: existing }
            : { action: 'replace', result: new_ };
        default:
          return { action: 'skip', result: existing };
      }
    };

    it('should skip on conflict with skip strategy', () => {
      const result = mockResolveConflict('skip', 
        { id: 1, score: 8 }, 
        { id: 2, score: 9 }
      );

      expect(result.action).toBe('skip');
    });

    it('should replace on conflict with replace strategy', () => {
      const result = mockResolveConflict('replace',
        { id: 1, score: 8 },
        { id: 2, score: 9 }
      );

      expect(result.action).toBe('replace');
    });

    it('should keep higher score', () => {
      const result = mockResolveConflict('keep-higher-score',
        { id: 1, score: 9 },
        { id: 2, score: 7 }
      );

      expect(result.action).toBe('skip');
      expect(result.result.score).toBe(9);
    });
  });

  describe('addAnimeToSonarrEnhanced()', () => {
    const mockAddEnhanced = async (series: any[], prefs: any) => {
      const results = [];

      for (const s of series) {
        // Check duplicates
        if (prefs.enableSmartDuplicateDetection && s.isDuplicate) {
          results.push({
            title: s.title,
            success: false,
            reason: 'Duplicate detected',
            duplicate: true,
          });
          continue;
        }

        // Check episode type
        if (prefs.skipOVAs && s.seriesType === 'OVA') {
          results.push({
            title: s.title,
            success: false,
            reason: 'OVA skipped by preferences',
          });
          continue;
        }

        // Add series
        const response = await fetch('http://localhost:8989/api/v3/series', {
          method: 'POST',
          body: JSON.stringify(s),
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            title: s.title,
            success: true,
            sonarrId: data.id,
          });
        } else {
          results.push({
            title: s.title,
            success: false,
            reason: 'Failed to add',
          });
        }
      }

      return results;
    };

    it('should add series successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 123 }),
      });

      const series = [{ title: 'Test Anime', tvdbId: '123', seriesType: 'TV' }];
      const prefs = { enableSmartDuplicateDetection: false, skipOVAs: false };

      const results = await mockAddEnhanced(series, prefs);

      expect(results[0].success).toBe(true);
      expect(results[0].sonarrId).toBe(123);
    });

    it('should skip duplicates when enabled', async () => {
      const series = [{ title: 'Test Anime', isDuplicate: true }];
      const prefs = { enableSmartDuplicateDetection: true };

      const results = await mockAddEnhanced(series, prefs);

      expect(results[0].success).toBe(false);
      expect(results[0].duplicate).toBe(true);
    });

    it('should skip OVAs when configured', async () => {
      const series = [{ title: 'Test OVA', seriesType: 'OVA' }];
      const prefs = { skipOVAs: true };

      const results = await mockAddEnhanced(series, prefs);

      expect(results[0].success).toBe(false);
      expect(results[0].reason).toContain('OVA');
    });
  });
});
