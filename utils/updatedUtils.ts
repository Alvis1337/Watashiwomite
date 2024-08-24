export interface Anime {
    title: string;
}

interface AnimeSeries {
    title: string;
    tvdbId: string;
  }

export const addAnimeToSonarr = async (
    animeSeries: AnimeSeries[], 
    rootFolder: string
  ): Promise<void> => {
    const sonarrUrl = `${process.env.SONARR_URL}/api/v3/series?apikey=${process.env.SONARR_API_KEY}`;
  
    for (const series of animeSeries) {
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

      try {
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
            const result = await response.json();
            return result
          }
        } catch (error) {
          console.error(`Error adding series: ${series.title}`, error);
        }
    }
  };
  