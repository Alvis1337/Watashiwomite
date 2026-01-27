/**
 * Tests for string utility functions
 */

describe('String normalization utilities', () => {
  // Helper function from sync logic
  function normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  describe('normalizeTitle', () => {
    it('should normalize basic titles', () => {
      expect(normalizeTitle('Attack on Titan')).toBe('attack on titan');
      expect(normalizeTitle('My Hero Academia')).toBe('my hero academia');
    });

    it('should remove special characters', () => {
      expect(normalizeTitle('Re:Zero - Starting Life in Another World')).toBe('rezero starting life in another world');
      expect(normalizeTitle('Steins;Gate')).toBe('steinsgate');
    });

    it('should handle multiple spaces', () => {
      expect(normalizeTitle('Title   With    Spaces')).toBe('title with spaces');
    });

    it('should trim whitespace', () => {
      expect(normalizeTitle('  Trimmed Title  ')).toBe('trimmed title');
    });

    it('should handle Japanese punctuation', () => {
      expect(normalizeTitle('Sword Art Online: Alicization')).toBe('sword art online alicization');
      expect(normalizeTitle('Fate/stay night')).toBe('fatestay night');
    });

    it('should handle empty strings', () => {
      expect(normalizeTitle('')).toBe('');
      expect(normalizeTitle('   ')).toBe('');
    });

    it('should handle all special characters', () => {
      expect(normalizeTitle('!!!Special@#$%Title^^^')).toBe('specialtitle');
    });
  });
});

describe('MAL ID validation', () => {
  function isValidMALId(id: any): boolean {
    return typeof id === 'number' && id > 0 && Number.isInteger(id);
  }

  describe('isValidMALId', () => {
    it('should accept valid MAL IDs', () => {
      expect(isValidMALId(1)).toBe(true);
      expect(isValidMALId(12345)).toBe(true);
      expect(isValidMALId(999999)).toBe(true);
    });

    it('should reject invalid MAL IDs', () => {
      expect(isValidMALId(0)).toBe(false);
      expect(isValidMALId(-1)).toBe(false);
      expect(isValidMALId(1.5)).toBe(false);
      expect(isValidMALId('123')).toBe(false);
      expect(isValidMALId(null)).toBe(false);
      expect(isValidMALId(undefined)).toBe(false);
      expect(isValidMALId(NaN)).toBe(false);
    });
  });
});
