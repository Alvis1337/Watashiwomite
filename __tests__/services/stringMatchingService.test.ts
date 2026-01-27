import {
  normalizeTitle,
  levenshtein,
  findClosestMatch,
  titlesMatch,
} from '@/services/stringMatchingService';

describe('String Matching Service', () => {
  describe('normalizeTitle()', () => {
    it('should normalize basic titles', () => {
      expect(normalizeTitle('Attack on Titan')).toBe('attack on titan');
      expect(normalizeTitle('My Hero Academia')).toBe('my hero academia');
    });

    it('should remove special characters', () => {
      expect(normalizeTitle('Re:Zero - Starting Life')).toBe('rezero starting life');
      expect(normalizeTitle('JoJo\'s Bizarre Adventure')).toBe('jojos bizarre adventure');
      expect(normalizeTitle('Fate/stay night')).toBe('fatestay night');
    });

    it('should normalize whitespace', () => {
      expect(normalizeTitle('Title   With    Spaces')).toBe('title with spaces');
    });

    it('should handle empty strings', () => {
      expect(normalizeTitle('')).toBe('');
    });
  });

  describe('levenshtein()', () => {
    it('should calculate edit distance', () => {
      expect(levenshtein('kitten', 'sitting')).toBe(3);
      expect(levenshtein('hello', 'hello')).toBe(0);
      expect(levenshtein('', 'test')).toBe(4);
    });
  });

  describe('findClosestMatch()', () => {
    const candidates = ['Attack on Titan', 'My Hero Academia', 'Demon Slayer'];

    it('should find exact match', () => {
      expect(findClosestMatch('Attack on Titan', candidates)).toBe('Attack on Titan');
    });

    it('should find close match', () => {
      expect(findClosestMatch('Atack on Titan', candidates)).toBe('Attack on Titan');
    });

    it('should return null for no match', () => {
      expect(findClosestMatch('Completely Different', candidates)).toBeNull();
    });
  });

  describe('titlesMatch()', () => {
    it('should match similar titles', () => {
      expect(titlesMatch('Attack on Titan', 'Attack on Titan')).toBe(true);
      expect(titlesMatch('Attack on Titan', 'Atack on Titan')).toBe(true);
    });

    it('should not match different titles', () => {
      expect(titlesMatch('Attack on Titan', 'One Piece')).toBe(false);
    });

    it('should respect threshold', () => {
      expect(titlesMatch('abc', 'xyz', 1)).toBe(false);
      expect(titlesMatch('abc', 'xyz', 10)).toBe(true);
    });
  });
});
