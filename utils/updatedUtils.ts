export interface Anime {
  title: string;
}

interface AnimeSeries {
  title: string;
  tvdbId: string;
}


// TODO: need to add a double check so that if a series with the same name exists, dont try and add it again. also report to the user what failed to get added.
// i throw a console error; errorMessage: 'This series has already been added',, well sonarr does but for some reason we keep returning
// it in the tvdbIds function and trying to add it. same with redline under my alvisleet username.
export const addAnimeToSonarr = async (
  animeSeries: AnimeSeries[],
  rootFolder: string
): Promise<void> => {
  const sonarrUrl = `${process.env.SONARR_URL}/api/v3/series?apikey=${process.env.SONARR_API_KEY}`;

  const results = [];

  for (const series of animeSeries) {
    console.log(`Trying to add ${series.title} with tvdbid of ${series.tvdbId} to Sonarr`)
    const sonarrRequestBody = {
      tvdbId: series.tvdbId,
      title: series.title,
      qualityProfileId: 1,
      seriesType: 'standard',
      seasonFolder: true,
      monitored: true,
      rootFolderPath: rootFolder,
      addOptions: {
        searchForMissingEpisodes: false,
      },
    };

    const response = await fetch(sonarrUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sonarrRequestBody),
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      console.error(`Failed to add series: ${series.title}`, errorResponse);
    } else {
      console.log(`Added ${series.title} to Sonarr`)
      const result = await response.json();
      results.push(result);
    }
  }
}