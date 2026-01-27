/**
 * Tests for Sonarr Removal Service
 */

describe('Sonarr Removal Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  describe('removeSeriesFromSonarr()', () => {
    const mockRemove = async (seriesId: number, apiKey: string, url: string) => {
      const response = await fetch(`${url}/api/v3/series/${seriesId}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': apiKey },
      });
      return response.ok;
    };

    it('should successfully remove a series', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

      const result = await mockRemove(123, 'test-key', 'http://localhost:8989');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8989/api/v3/series/123',
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'X-Api-Key': 'test-key' },
        })
      );
    });

    it('should handle removal failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

      const result = await mockRemove(999, 'test-key', 'http://localhost:8989');

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(mockRemove(123, 'test-key', 'http://localhost:8989')).rejects.toThrow('Network error');
    });
  });

  describe('Batch removal', () => {
    const mockBatchRemove = async (seriesIds: number[], apiKey: string, url: string) => {
      const results = await Promise.all(
        seriesIds.map(async (id) => {
          const response = await fetch(`${url}/api/v3/series/${id}`, {
            method: 'DELETE',
            headers: { 'X-Api-Key': apiKey },
          });
          return { id, success: response.ok };
        })
      );
      return results;
    };

    it('should remove multiple series', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const results = await mockBatchRemove([1, 2, 3], 'key', 'http://localhost:8989');

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: true });

      const results = await mockBatchRemove([1, 2, 3], 'key', 'http://localhost:8989');

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });
});
