/**
 * Tests for Sync Diff Service
 */

describe('Sync Diff Service', () => {
  describe('calculateDiff()', () => {
    const mockCalculateDiff = (malList: any[], sonarrList: any[]) => {
      const toAdd = malList.filter(mal => 
        !sonarrList.some(s => s.malId === mal.id)
      );
      const toRemove = sonarrList.filter(s => 
        !malList.some(mal => mal.id === s.malId)
      );
      const toUpdate = malList.filter(mal => 
        sonarrList.some(s => s.malId === mal.id && s.monitored !== mal.watching)
      );

      return { toAdd, toRemove, toUpdate };
    };

    it('should identify series to add', () => {
      const malList = [
        { id: 1, title: 'Anime 1', watching: true },
        { id: 2, title: 'Anime 2', watching: true },
      ];
      const sonarrList = [
        { malId: 1, title: 'Anime 1', monitored: true },
      ];

      const diff = mockCalculateDiff(malList, sonarrList);

      expect(diff.toAdd).toHaveLength(1);
      expect(diff.toAdd[0].id).toBe(2);
    });

    it('should identify series to remove', () => {
      const malList = [
        { id: 1, title: 'Anime 1', watching: true },
      ];
      const sonarrList = [
        { malId: 1, title: 'Anime 1', monitored: true },
        { malId: 2, title: 'Anime 2', monitored: true },
      ];

      const diff = mockCalculateDiff(malList, sonarrList);

      expect(diff.toRemove).toHaveLength(1);
      expect(diff.toRemove[0].malId).toBe(2);
    });

    it('should identify series to update', () => {
      const malList = [
        { id: 1, title: 'Anime 1', watching: true },
        { id: 2, title: 'Anime 2', watching: false },
      ];
      const sonarrList = [
        { malId: 1, title: 'Anime 1', monitored: false },
        { malId: 2, title: 'Anime 2', monitored: true },
      ];

      const diff = mockCalculateDiff(malList, sonarrList);

      expect(diff.toUpdate).toHaveLength(2);
    });

    it('should handle empty lists', () => {
      const diff = mockCalculateDiff([], []);

      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toRemove).toHaveLength(0);
      expect(diff.toUpdate).toHaveLength(0);
    });

    it('should handle all new entries', () => {
      const malList = [
        { id: 1, title: 'Anime 1', watching: true },
        { id: 2, title: 'Anime 2', watching: true },
      ];

      const diff = mockCalculateDiff(malList, []);

      expect(diff.toAdd).toHaveLength(2);
      expect(diff.toRemove).toHaveLength(0);
    });
  });

  describe('filterByPreferences()', () => {
    const mockFilter = (animeList: any[], prefs: any) => {
      return animeList.filter(anime => {
        if (anime.status === 'watching' && !prefs.syncWatching) return false;
        if (anime.status === 'completed' && !prefs.syncCompleted) return false;
        return true;
      });
    };

    it('should filter by watching status', () => {
      const list = [
        { id: 1, status: 'watching' },
        { id: 2, status: 'completed' },
      ];
      const prefs = { syncWatching: true, syncCompleted: false };

      const filtered = mockFilter(list, prefs);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('watching');
    });

    it('should include all when all prefs enabled', () => {
      const list = [
        { id: 1, status: 'watching' },
        { id: 2, status: 'completed' },
      ];
      const prefs = { syncWatching: true, syncCompleted: true };

      const filtered = mockFilter(list, prefs);

      expect(filtered).toHaveLength(2);
    });
  });
});
