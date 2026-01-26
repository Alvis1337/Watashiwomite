export interface Anime {
  title: string;
}

interface AnimeSeries {
  title: string;
  tvdbId: string;
}

interface AddResult {
  title: string;
  success: boolean;
  reason?: string;
}

/**
 * Adds anime series to Sonarr
 * Checks for duplicates before attempting to add
 * Returns detailed results for each series
 */
export const addAnimeToSonarr = async (
  animeSeries: AnimeSeries[],
  rootFolder: string,
  searchForMissingEpisodes: boolean = false
): Promise<AddResult[]> => {
  const sonarrUrl = `${process.env.SONARR_URL}/api/v3/series`;
  const sonarrApiKey = process.env.SONARR_API_KEY;

  if (!sonarrApiKey) {
    throw new Error('SONARR_API_KEY is not configured');
  }

  // First, get existing series from Sonarr to check for duplicates
  let existingSeries: Set<number> = new Set();
  try {
    const existingResponse = await fetch(sonarrUrl, {
      headers: {
        'X-Api-Key': sonarrApiKey,
      },
    });
    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      existingSeries = new Set(existing.map((s: any) => parseInt(s.tvdbId)));
    }
  } catch (error) {
    console.error('Failed to fetch existing series from Sonarr:', error);
  }

  const results: AddResult[] = [];

  for (const series of animeSeries) {
    const tvdbIdNum = parseInt(series.tvdbId);

    // Check if series already exists
    if (existingSeries.has(tvdbIdNum)) {
      results.push({
        title: series.title,
        success: false,
        reason: 'Already exists in Sonarr',
      });
      continue;
    }


    const sonarrRequestBody = {
      tvdbId: tvdbIdNum,
      title: series.title,
      qualityProfileId: 1,
      seriesType: 'standard',
      seasonFolder: true,
      monitored: true,
      rootFolderPath: rootFolder,
      addOptions: {
        searchForMissingEpisodes: searchForMissingEpisodes,
      },
    };

    try {
      const response = await fetch(sonarrUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': sonarrApiKey,
        },
        body: JSON.stringify(sonarrRequestBody),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        console.error(`Failed to add series: ${series.title}`, errorResponse);

        // Check if it's a duplicate error
        const isDuplicate = errorResponse.some((err: any) =>
          err.errorMessage?.includes('already been added')
        );

        // Check for TVDB-related errors
        const isTvdbNotFound = errorResponse.some(
          (err: any) =>
            err.errorMessage?.toLowerCase().includes('tvdb') ||
            err.errorMessage?.toLowerCase().includes('not found') ||
            err.errorMessage?.toLowerCase().includes('could not find')
        );

        let reason = errorResponse[0]?.errorMessage || 'Unknown error';

        if (isDuplicate) {
          reason = 'Already exists in Sonarr';
        } else if (isTvdbNotFound) {
          reason = 'Could not find on TVDB';
        }

        results.push({
          title: series.title,
          success: false,
          reason: reason,
        });
      } else {
        await response.json(); // Consume response
        existingSeries.add(tvdbIdNum); // Add to our tracking set
        results.push({
          title: series.title,
          success: true,
        });
      }
    } catch (error) {
      console.error(`Error adding ${series.title}:`, error);
      results.push({
        title: series.title,
        success: false,
        reason: error instanceof Error ? error.message : 'Network error',
      });
    }
  }

  // Log summary
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  return results;
};
