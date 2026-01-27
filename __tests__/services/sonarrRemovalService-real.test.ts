/**
 * REAL tests for services/sonarrRemovalService.ts
 */

import { removeAnimeFromSonarr } from '@/services/sonarrRemovalService';

describe('Sonarr Removal Service - REAL TESTS', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  describe('removeAnimeFromSonarr()', () => {
    it('should successfully remove anime', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await removeAnimeFromSonarr(
        'testuser',
        [123, 456],
        'http://localhost:3000'
      );

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(2);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sonarr/remove',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('123'),
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: async () => 'Failed to remove',
      });

      const result = await removeAnimeFromSonarr(
        'testuser',
        [123],
        'http://localhost:3000'
      );

      expect(result.success).toBe(false);
      expect(result.removedCount).toBe(0);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await removeAnimeFromSonarr(
        'testuser',
        [123],
        'http://localhost:3000'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle empty MAL ID list', async () => {
      const result = await removeAnimeFromSonarr(
        'testuser',
        [],
        'http://localhost:3000'
      );

      expect(result.removedCount).toBe(0);
    });
  });
});
