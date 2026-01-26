/**
 * Sync Diff Service
 * Calculates differences between MAL and Sonarr lists
 */

import prisma from '../lib/prisma';
import { normalizeTitle, findClosestMatch, levenshtein } from './stringMatchingService';

export interface SonarrSeriesData {
  id: number;
  titles: string[];
}

/**
 * Prepare Sonarr series data with alternate titles for matching
 */
export function prepareSonarrData(sonarrSeries: any[]): SonarrSeriesData[] {
  return sonarrSeries.map((s: any) => {
    const alternateTitles = Array.isArray(s.alternateTitles)
      ? s.alternateTitles
          .map((at: any) =>
            typeof at === 'object' && at !== null && 'title' in at
              ? (at.title as string).toLowerCase()
              : null
          )
          .filter((title: any): title is string => title !== null)
      : [];
    return {
      id: s.id,
      titles: [s.title.toLowerCase(), ...alternateTitles],
    };
  });
}

/**
 * Find anime titles that are in MAL but not in Sonarr
 */
export function findUniqueToMal(
  malTitles: string[],
  sonarrTitles: Set<string>,
  threshold: number = 5
): string[] {
  return malTitles.filter((title: string) => {
    const match = findClosestMatch(title, Array.from(sonarrTitles), threshold);
    return !match || levenshtein(normalizeTitle(title), normalizeTitle(match)) > threshold;
  });
}

/**
 * Find titles that are in Sonarr but not in MAL
 */
export function findUniqueToSonarr(
  sonarrTitles: Set<string>,
  malTitles: string[],
  threshold: number = 5
): string[] {
  return Array.from(sonarrTitles).filter((title: string) => {
    const match = findClosestMatch(title, malTitles, threshold);
    return !match || levenshtein(normalizeTitle(title), normalizeTitle(match)) > threshold;
  });
}

/**
 * Update Sonarr series with MAL IDs based on title matching
 */
export async function linkSonarrToMalIds(
  sonarrSeries: SonarrSeriesData[],
  malTitles: string[]
): Promise<void> {
  for (const series of sonarrSeries) {
    for (const title of series.titles) {
      const closestMatch = findClosestMatch(title, malTitles);

      if (closestMatch) {
        const anime = await prisma.anime.findFirst({
          where: { title: closestMatch },
        });

        if (anime) {
          await prisma.sonarrSeries.update({
            where: { id: series.id },
            data: { malId: anime.malId },
          });
        }
      }
    }
  }
}

/**
 * Calculate complete sync diff between MAL and Sonarr
 */
export async function calculateSyncDiff(
  malAnime: any[],
  sonarrSeries: any[],
  fuzzyMatchThreshold: number = 5
) {
  const malTitles = malAnime.map((a: any) => a.title);
  const preparedSonarr = prepareSonarrData(sonarrSeries);
  const sonarrTitles = preparedSonarr.flatMap((series: any) => series.titles);
  const sonarrTitlesSet = new Set<string>(sonarrTitles);

  const uniqueToMal = findUniqueToMal(malTitles, sonarrTitlesSet, fuzzyMatchThreshold);
  const uniqueToSonarr = findUniqueToSonarr(sonarrTitlesSet, malTitles, fuzzyMatchThreshold);

  // Link Sonarr series to MAL IDs
  await linkSonarrToMalIds(preparedSonarr, malTitles);

  return {
    uniqueToMal,
    uniqueToSonarr,
    malTitles,
    sonarrSeries: preparedSonarr,
  };
}
