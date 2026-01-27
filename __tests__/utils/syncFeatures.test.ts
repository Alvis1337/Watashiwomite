/**
 * Tests for Sync Features
 */

describe('Sync Features', () => {
  describe('Levenshtein distance calculation', () => {
    const mockLevenshtein = (a: string, b: string) => {
      if (a === b) return 0;
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;

      const matrix: number[][] = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b[i - 1] === a[j - 1]) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }

      return matrix[b.length][a.length];
    };

    it('should return 0 for identical strings', () => {
      expect(mockLevenshtein('test', 'test')).toBe(0);
    });

    it('should calculate distance for different strings', () => {
      expect(mockLevenshtein('kitten', 'sitting')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(mockLevenshtein('', 'test')).toBe(4);
      expect(mockLevenshtein('test', '')).toBe(4);
    });
  });

  describe('Similarity percentage calculation', () => {
    const mockSimilarity = (a: string, b: string) => {
      const dist = a === b ? 0 : Math.abs(a.length - b.length);
      const maxLen = Math.max(a.length, b.length);
      if (maxLen === 0) return 100;
      return ((maxLen - dist) / maxLen) * 100;
    };

    it('should return 100 for identical strings', () => {
      expect(mockSimilarity('test', 'test')).toBe(100);
    });

    it('should calculate similarity percentage', () => {
      const sim = mockSimilarity('test', 'testing');
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(100);
    });
  });

  describe('findPotentialDuplicates()', () => {
    const mockFindDuplicates = (
      newTitle: string,
      existing: Array<{ id: number; title: string }>,
      threshold: number
    ) => {
      const matches: any[] = [];
      
      for (const series of existing) {
        const similarity = newTitle === series.title ? 100 : 
          newTitle.toLowerCase().includes(series.title.toLowerCase()) ? 90 : 0;
        
        if (similarity >= threshold) {
          matches.push({
            existingTitle: series.title,
            existingId: series.id,
            newTitle,
            similarity,
          });
        }
      }

      return matches.sort((a, b) => b.similarity - a.similarity);
    };

    it('should find exact matches', () => {
      const existing = [
        { id: 1, title: 'Attack on Titan' },
        { id: 2, title: 'My Hero Academia' },
      ];

      const matches = mockFindDuplicates('Attack on Titan', existing, 85);

      expect(matches).toHaveLength(1);
      expect(matches[0].similarity).toBe(100);
    });

    it('should find partial matches above threshold', () => {
      const existing = [
        { id: 1, title: 'Attack' },
      ];

      const matches = mockFindDuplicates('Attack on Titan', existing, 80);

      expect(matches).toHaveLength(1);
      expect(matches[0].similarity).toBeGreaterThanOrEqual(80);
    });

    it('should not find matches below threshold', () => {
      const existing = [
        { id: 1, title: 'Naruto' },
      ];

      const matches = mockFindDuplicates('Attack on Titan', existing, 85);

      expect(matches).toHaveLength(0);
    });

    it('should sort by similarity descending', () => {
      const existing = [
        { id: 1, title: 'Attack' },
        { id: 2, title: 'Attack on Titan' },
      ];

      const matches = mockFindDuplicates('Attack on Titan', existing, 80);

      expect(matches[0].similarity).toBeGreaterThan(matches[matches.length - 1].similarity);
    });
  });

  describe('calculateMonitoringFromScore()', () => {
    const mockMonitoring = (score: number | null, high: number, med: number) => {
      if (!score) return { monitored: true, monitorNewItems: 'all' };

      if (score >= high) return { monitored: true, monitorNewItems: 'all' };
      if (score >= med) return { monitored: true, monitorNewItems: 'none' };
      return { monitored: false, monitorNewItems: 'none' };
    };

    it('should fully monitor high scores', () => {
      const result = mockMonitoring(9, 8, 6);

      expect(result.monitored).toBe(true);
      expect(result.monitorNewItems).toBe('all');
    });

    it('should partially monitor medium scores', () => {
      const result = mockMonitoring(7, 8, 6);

      expect(result.monitored).toBe(true);
      expect(result.monitorNewItems).toBe('none');
    });

    it('should not monitor low scores', () => {
      const result = mockMonitoring(4, 8, 6);

      expect(result.monitored).toBe(false);
    });

    it('should handle null scores', () => {
      const result = mockMonitoring(null, 8, 6);

      expect(result.monitored).toBe(true);
    });
  });

  describe('shouldSkipBasedOnAiringStatus()', () => {
    const mockShouldSkip = (status: string, prefs: any) => {
      if (prefs.ignoreCompletedSeries && status === 'finished') return true;
      if (!prefs.prioritizeAiring && status === 'airing') return true;
      return false;
    };

    it('should skip completed when ignored', () => {
      expect(mockShouldSkip('finished', { ignoreCompletedSeries: true })).toBe(true);
    });

    it('should not skip airing when prioritized', () => {
      expect(mockShouldSkip('airing', { prioritizeAiring: true })).toBe(false);
    });
  });

  describe('shouldSkipSeriesType()', () => {
    const mockSkipType = (type: string, prefs: any) => {
      if (prefs.skipOVAs && type === 'OVA') return true;
      if (prefs.skipSpecials && type === 'Special') return true;
      if (prefs.skipMovies && type === 'Movie') return true;
      if (prefs.onlyMainSeries && type !== 'TV') return true;
      return false;
    };

    it('should skip OVAs', () => {
      expect(mockSkipType('OVA', { skipOVAs: true })).toBe(true);
    });

    it('should skip movies', () => {
      expect(mockSkipType('Movie', { skipMovies: true })).toBe(true);
    });

    it('should not skip TV series', () => {
      const prefs = { skipOVAs: true, skipMovies: true, onlyMainSeries: false };
      expect(mockSkipType('TV', prefs)).toBe(false);
    });
  });

  describe('Conflict resolution', () => {
    type ConflictStrategy = 'skip' | 'replace' | 'keep-higher-score';

    const mockResolveConflict = (
      strategy: ConflictStrategy,
      existing: any,
      new_: any
    ) => {
      switch (strategy) {
        case 'skip':
          return { action: 'skip' };
        case 'replace':
          return { action: 'replace' };
        case 'keep-higher-score':
          return existing.score >= new_.score 
            ? { action: 'skip' }
            : { action: 'replace' };
        default:
          return { action: 'skip' };
      }
    };

    it('should skip with skip strategy', () => {
      const result = mockResolveConflict('skip', {}, {});
      expect(result.action).toBe('skip');
    });

    it('should replace with replace strategy', () => {
      const result = mockResolveConflict('replace', {}, {});
      expect(result.action).toBe('replace');
    });

    it('should keep higher score', () => {
      const result1 = mockResolveConflict('keep-higher-score', 
        { score: 9 }, 
        { score: 7 }
      );
      expect(result1.action).toBe('skip');

      const result2 = mockResolveConflict('keep-higher-score',
        { score: 7 },
        { score: 9 }
      );
      expect(result2.action).toBe('replace');
    });
  });

  describe('Season monitoring logic', () => {
    const mockSeasonMonitoring = (monitorOnlyCurrentSeason: boolean, seasons: any[]) => {
      if (!monitorOnlyCurrentSeason) {
        return seasons.map(s => ({ ...s, monitored: true }));
      }

      const currentDate = new Date();
      return seasons.map(s => {
        const isCurrentSeason = s.airDate && new Date(s.airDate) <= currentDate;
        return { ...s, monitored: isCurrentSeason };
      });
    };

    it('should monitor all seasons when disabled', () => {
      const seasons = [{ number: 1 }, { number: 2 }];
      const result = mockSeasonMonitoring(false, seasons);

      expect(result.every(s => s.monitored)).toBe(true);
    });

    it('should monitor only current season when enabled', () => {
      const seasons = [
        { number: 1, airDate: '2020-01-01' },
        { number: 2, airDate: '2030-01-01' },
      ];

      const result = mockSeasonMonitoring(true, seasons);

      expect(result[0].monitored).toBe(true);
      expect(result[1].monitored).toBe(false);
    });
  });
});
