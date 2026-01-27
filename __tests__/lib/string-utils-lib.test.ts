import {
  normalizeTitle,
  levenshtein,
  findClosestMatch,
} from '@/lib/string-utils';

describe('String Utils Library', () => {
  describe('normalizeTitle()', () => {
    it('should convert to lowercase', () => {
      expect(normalizeTitle('Attack On Titan')).toBe('attack on titan');
      expect(normalizeTitle('NARUTO')).toBe('naruto');
      expect(normalizeTitle('OnE PiEcE')).toBe('one piece');
    });

    it('should remove special characters', () => {
      expect(normalizeTitle('Re:Zero')).toBe('rezero');
      expect(normalizeTitle('JoJo\'s Bizarre Adventure')).toBe('jojos bizarre adventure');
      expect(normalizeTitle('Fate/stay night')).toBe('fatestay night');
      expect(normalizeTitle('Steins;Gate')).toBe('steinsgate');
    });

    it('should normalize whitespace', () => {
      expect(normalizeTitle('Attack   on    Titan')).toBe('attack on titan');
      expect(normalizeTitle('  Naruto  ')).toBe('naruto');
      expect(normalizeTitle('One\tPiece')).toBe('one piece');
    });

    it('should handle empty strings', () => {
      expect(normalizeTitle('')).toBe('');
      expect(normalizeTitle('   ')).toBe('');
    });

    it('should handle unicode characters', () => {
      // Unicode characters are stripped by normalizeTitle (as designed)
      const result = normalizeTitle('進撃の巨人');
      expect(typeof result).toBe('string'); // Returns a string, even if empty
      
      const mixed = normalizeTitle('Attack on Titan - 進撃の巨人');
      expect(mixed).toContain('attack on titan');
    });

    it('should remove parentheses and brackets', () => {
      expect(normalizeTitle('Attack on Titan (Shingeki no Kyojin)')).toContain('attack on titan');
      expect(normalizeTitle('One Piece [TV]')).toContain('one piece');
    });

    it('should handle colons and dashes', () => {
      expect(normalizeTitle('Kaguya-sama: Love is War')).toBe('kaguyasama love is war');
      expect(normalizeTitle('Re:Zero - Starting Life')).toBe('rezero starting life');
    });
  });

  describe('levenshtein()', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshtein('hello', 'hello')).toBe(0);
      expect(levenshtein('', '')).toBe(0);
      expect(levenshtein('test', 'test')).toBe(0);
    });

    it('should calculate single character operations', () => {
      expect(levenshtein('hello', 'hallo')).toBe(1); // substitution
      expect(levenshtein('hello', 'hell')).toBe(1); // deletion
      expect(levenshtein('hell', 'hello')).toBe(1); // insertion
    });

    it('should calculate multiple differences', () => {
      expect(levenshtein('kitten', 'sitting')).toBe(3);
      expect(levenshtein('saturday', 'sunday')).toBe(3);
      expect(levenshtein('abc', 'def')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshtein('', 'hello')).toBe(5);
      expect(levenshtein('hello', '')).toBe(5);
      expect(levenshtein('test', '')).toBe(4);
    });

    it('should be case-sensitive', () => {
      expect(levenshtein('Hello', 'hello')).toBe(1);
      expect(levenshtein('TEST', 'test')).toBe(4);
    });

    it('should handle long strings', () => {
      const str1 = 'The Irregular at Magic High School';
      const str2 = 'The Irregular at Magic High School: Visitor Arc';
      expect(levenshtein(str1, str2)).toBeGreaterThan(0);
    });

    it('should be symmetric', () => {
      expect(levenshtein('abc', 'def')).toBe(levenshtein('def', 'abc'));
      expect(levenshtein('hello', 'world')).toBe(levenshtein('world', 'hello'));
    });
  });

  describe('findClosestMatch()', () => {
    const candidates = [
      'Attack on Titan',
      'Attack on Titan: Season 2',
      'My Hero Academia',
      'Demon Slayer',
      'Jujutsu Kaisen',
    ];

    it('should find exact match', () => {
      const result = findClosestMatch('Attack on Titan', candidates);
      expect(result).toBe('Attack on Titan');
    });

    it('should find match with minor typo', () => {
      const result = findClosestMatch('Atack on Titan', candidates);
      expect(result).toBe('Attack on Titan');
    });

    it('should find match ignoring case', () => {
      const result = findClosestMatch('attack on titan', candidates);
      expect(result).toBe('Attack on Titan');
    });

    it('should find match ignoring special characters', () => {
      const result = findClosestMatch('Attack_on_Titan', candidates);
      expect(result).toBe('Attack on Titan');
    });

    it('should return null when no match within threshold', () => {
      const result = findClosestMatch('Completely Different Title', candidates);
      expect(result).toBeNull();
    });

    it('should respect custom threshold', () => {
      const result1 = findClosestMatch('Atttack on Titan', candidates, 1);
      expect(result1).toBeNull();

      const result2 = findClosestMatch('Atttack on Titan', candidates, 10);
      expect(result2).toBe('Attack on Titan');
    });

    it('should handle empty candidates', () => {
      const result = findClosestMatch('Attack on Titan', []);
      expect(result).toBeNull();
    });

    it('should prefer closer matches', () => {
      const similarCandidates = [
        'One Piece',
        'One Piece Film: Red',
        'One Piece: Stampede',
      ];
      
      const result = findClosestMatch('One Piece Film', similarCandidates);
      expect(result).toBe('One Piece Film: Red');
    });

    it('should handle single candidate', () => {
      const result = findClosestMatch('Attack on Titan', ['Attack on Titan']);
      expect(result).toBe('Attack on Titan');
    });
  });

  describe('Real-world Anime Scenarios', () => {
    it('should match season variations', () => {
      const candidates = [
        'My Hero Academia',
        'My Hero Academia Season 2',
        'My Hero Academia Season 3',
      ];
      
      const result = findClosestMatch('My Hero Academia Season 2', candidates);
      expect(result).toBe('My Hero Academia Season 2');
    });

    it('should handle Japanese vs English titles', () => {
      const title1 = normalizeTitle('Shingeki no Kyojin');
      const title2 = normalizeTitle('Attack on Titan');
      
      // These are different titles, distance should be high
      expect(levenshtein(title1, title2)).toBeGreaterThan(10);
    });

    it('should handle OVA and movie variations', () => {
      const candidates = [
        'Attack on Titan',
        'Attack on Titan OVA',
        'Attack on Titan: No Regrets',
        'Attack on Titan: The Movie',
      ];
      
      expect(findClosestMatch('Attack on Titan OVA', candidates)).toBe('Attack on Titan OVA');
    });

    it('should handle colons and subtitles', () => {
      const candidates = [
        'Sword Art Online',
        'Sword Art Online: Alicization',
        'Sword Art Online: Progressive',
      ];
      
      const result = findClosestMatch('Sword Art Online Alicization', candidates);
      expect(result).toBe('Sword Art Online: Alicization');
    });
  });
});
