/**
 * String Matching Service
 * Fuzzy matching utilities for comparing anime titles
 */

/**
 * Normalize a title for comparison by removing special characters and extra spaces
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of anime titles
 */
export function levenshtein(a: string, b: string): number {
  const alen = a.length;
  const blen = b.length;

  if (alen === 0) return blen;
  if (blen === 0) return alen;

  const matrix: number[][] = Array.from({ length: alen + 1 }, () => Array(blen + 1).fill(0));

  for (let i = 0; i <= alen; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= blen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= alen; i++) {
    for (let j = 1; j <= blen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[alen][blen];
}

/**
 * Find the closest matching title from a list of candidates
 * @param title - The title to match
 * @param candidates - List of candidate titles to search
 * @param threshold - Maximum edit distance to consider a match (default: 5)
 * @returns The closest matching title, or null if no match within threshold
 */
export function findClosestMatch(
  title: string,
  candidates: string[],
  threshold: number = 5
): string | null {
  const normalizedTitle = normalizeTitle(title);
  let closestMatch: string | null = null;
  let closestDistance = threshold;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeTitle(candidate);
    const distance = levenshtein(normalizedTitle, normalizedCandidate);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestMatch = candidate;
    }
  }

  return closestMatch;
}

/**
 * Check if two titles match within a given threshold
 */
export function titlesMatch(title1: string, title2: string, threshold: number = 5): boolean {
  const distance = levenshtein(normalizeTitle(title1), normalizeTitle(title2));
  return distance <= threshold;
}
