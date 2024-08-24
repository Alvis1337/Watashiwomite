import prisma from '../lib/prisma';

export const getUsernameFromToken = async (token) => {
    const usernameUrl = 'https://api.myanimelist.net/v2/users/@me';
    const response = await fetch(usernameUrl, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const data = await response.json();
    return data.name;
  };
  
  export const addAnimeToSonarr = async (animeTitle, tvdbId) => {
    const sonarrUrl = `${process.env.SONARR_URL}/api/v3/series?apikey=${process.env.SONARR_API_KEY}`;
      const sonarrRequestBody = {
          "tvdbId": tvdbId,
          "title": animeTitle,
          "qualityProfileId": '1',
          "seriesType": "Anime",
          "seasonFolder": 'true',
          "monitored": 'true',
          "rootFolderPath": `/new_downloads/Anime`,
          "addOptions": {
              "searchForMissingEpisodes": true,
          }
      }
  
      const response = await fetch(sonarrUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(sonarrRequestBody),
      });

      return response.json()
  }
  
  export const tvdbLogin = async (tvdbidApiKey) => {
    return await
          fetch('https://api4.thetvdb.com/v4/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              "apikey": tvdbidApiKey,
            }),
          })
              .then(response => response.json())
              .then(data => {
                return data.data.token
              })
              .catch(error => console.error('Error:', error));
  }
  
  //TODO: add check to not try to add anime to sonarr if it's already there
  export const getSonarrAnimeList = async () => {
      try {
        const list = fetch(`${process.env.SONARR_URL}/api/v3/series?apikey=${process.env.SONARR_API_KEY}`)
        const response = await list
        return response.json()
      } catch (e) {
        console.log(e)
      }
  }

  export const saveSonarrSeries = async (username, sonarrData) => {
    try {
        const animeList = await prisma.animeList.upsert({
            where: { username },
            update: {},
            create: { username },
        });
        for (const series of sonarrData) {
            console.log(series.id)
            const savedSeries = await prisma.sonarrSeries.upsert({
                where: { id: series.id },
                update: {
                    title: series.title,
                    alternateTitles: series.alternateTitles,
                    sortTitle: series.sortTitle,
                    status: series.status,
                    overview: series.overview,
                    previousAiring: series.previousAiring ? new Date(series.previousAiring) : null,
                    network: series.network,
                    airTime: series.airTime,
                    images: {
                        upsert: series.images.map(image => ({
                            where: { url: image.url },
                            update: {
                                coverType: image.coverType,
                                remoteUrl: image.remoteUrl,
                            },
                            create: {
                                coverType: image.coverType,
                                url: image.url,
                                remoteUrl: image.remoteUrl,
                            },
                        })),
                    },
                    originalLanguage: series.originalLanguage.name,
                    seasons: {
                        upsert: series.seasons.map(season => ({
                            where: {
                                seasonNumber_sonarrSeriesId: {
                                    seasonNumber: season.seasonNumber,
                                    sonarrSeriesId: series.id,
                                },
                            },
                            update: {
                                monitored: season.monitored,
                                statistics: season.statistics,
                            },
                            create: {
                                seasonNumber: season.seasonNumber,
                                monitored: season.monitored,
                                statistics: season.statistics,
                                sonarrSeriesId: series.id,
                            },
                        })),
                    },
                    year: series.year,
                    path: series.path,
                    qualityProfileId: series.qualityProfileId,
                    seasonFolder: series.seasonFolder,
                    monitored: series.monitored,
                    monitorNewItems: series.monitorNewItems,
                    useSceneNumbering: series.useSceneNumbering,
                    runtime: series.runtime,
                    tvdbId: series.tvdbId,
                    tvRageId: series.tvRageId,
                    tvMazeId: series.tvMazeId,
                    tmdbId: series.tmdbId,
                    firstAired: series.firstAired ? new Date(series.firstAired) : null,
                    lastAired: series.lastAired ? new Date(series.lastAired) : null,
                    seriesType: series.seriesType,
                    cleanTitle: series.cleanTitle,
                    imdbId: series.imdbId,
                    titleSlug: series.titleSlug,
                    rootFolderPath: series.rootFolderPath,
                    certification: series.certification,
                    added: series.added ? new Date(series.added) : null,
                    ratings: series.ratings,
                    statistics: series.statistics,
                    languageProfileId: series.languageProfileId,
                    animeListId: animeList.id,
                },
                create: {
                    id: series.id,
                    title: series.title,
                    alternateTitles: series.alternateTitles,
                    sortTitle: series.sortTitle,
                    status: series.status,
                    overview: series.overview,
                    previousAiring: series.previousAiring ? new Date(series.previousAiring) : null,
                    network: series.network,
                    airTime: series.airTime,
                    images: {
                        create: series.images.map(image => ({
                            coverType: image.coverType,
                            url: image.url,
                            remoteUrl: image.remoteUrl,
                        })),
                    },
                    originalLanguage: series.originalLanguage.name,
                    seasons: {
                        create: series.seasons.map(season => ({
                            seasonNumber: season.seasonNumber,
                            monitored: season.monitored,
                            statistics: season.statistics,
                            sonarrSeriesId: series.id,
                        })),
                    },
                    year: series.year,
                    path: series.path,
                    qualityProfileId: series.qualityProfileId,
                    seasonFolder: series.seasonFolder,
                    monitored: series.monitored,
                    monitorNewItems: series.monitorNewItems,
                    useSceneNumbering: series.useSceneNumbering,
                    runtime: series.runtime,
                    tvdbId: series.tvdbId,
                    tvRageId: series.tvRageId,
                    tvMazeId: series.tvMazeId,
                    tmdbId: series.tmdbId,
                    firstAired: series.firstAired ? new Date(series.firstAired) : null,
                    lastAired: series.lastAired ? new Date(series.lastAired) : null,
                    seriesType: series.seriesType,
                    cleanTitle: series.cleanTitle,
                    imdbId: series.imdbId,
                    titleSlug: series.titleSlug,
                    rootFolderPath: series.rootFolderPath,
                    certification: series.certification,
                    added: series.added ? new Date(series.added) : null,
                    ratings: series.ratings,
                    statistics: series.statistics,
                    languageProfileId: series.languageProfileId,
                    animeListId: animeList.id,
                },
            });

            // Handle genres
            if (series.genres) {
                for (const genre of series.genres) {
                    await prisma.sonarrSeriesGenre.upsert({
                        where: {
                            genre_sonarrSeriesId: {
                                genre: genre,
                                sonarrSeriesId: savedSeries.id,
                            },
                        },
                        update: {},
                        create: {
                            genre: genre,
                            sonarrSeriesId: savedSeries.id,
                        },
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error saving Sonarr series:', error);
    }
};



  
  export const getTvdbIds = async (animeList, tvdbidApiKey) => {
      const tvdbIds = [];
  
      for (const animeTitle of animeList) {
          try {
              const tvdbToken = await tvdbLogin(tvdbidApiKey);
              const searchUrl = 'https://api4.thetvdb.com/v4/search?query=' + animeTitle.title + '&type=series&limit=1'
              const response = await fetch(searchUrl, {
                  method: 'GET',
                  headers: {
                      'Authorization': 'Bearer ' + tvdbToken,
                      'Content-Type': 'application/x-www-form-urlencoded',
                  },
              });
              const data = await response.json();
              let tvdbId = data.data[0].id;
              tvdbId = tvdbId.replace('series-', '');
              tvdbIds.push({title: animeTitle.title, tvdbId: tvdbId});
          } catch (error) {
              console.error(`Error fetching TVDB ID for ${animeTitle.title}: ${error.message}`);
          }
      }
  
      return tvdbIds;
  }
  
  export const getMALAnimeList = async (token, username) => {
    const watchingUrl = 'https://api.myanimelist.net/v2/users/@me/animelist?status=watching&fields=list_status,main_picture&limit=1000';
    let animeList = [];

    try {
      const response = await fetch(watchingUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
  
      const data = await response.json();
  
      for (const item of data.data) {
  
        const savedAnime = await prisma.anime.upsert({
            where: { malId: item.node.id },
            update: {
              title: item.node.title,
              mainPictureMedium: item.node.main_picture.medium,
              mainPictureLarge: item.node.main_picture.large,
              status: item.list_status.status,
              score: item.list_status.score,
              numEpisodesWatched: item.list_status.num_episodes_watched,
              isRewatching: item.list_status.is_rewatching,
              updatedAtMAL: new Date(item.list_status.updated_at),
              startDate: item.list_status.start_date ? new Date(item.list_status.start_date) : null,
            },
            create: {
              malId: item.node.id,
              title: item.node.title,
              mainPictureMedium: item.node.main_picture.medium,
              mainPictureLarge: item.node.main_picture.large,
              status: item.list_status.status,
              score: item.list_status.score,
              numEpisodesWatched: item.list_status.num_episodes_watched,
              isRewatching: item.list_status.is_rewatching,
              updatedAtMAL: new Date(item.list_status.updated_at),
              startDate: item.list_status.start_date ? new Date(item.list_status.start_date) : null,
              animeList: {
                connectOrCreate: {
                  where: { username: username },
                  create: { username: username },
                },
              },
            },
          });
          
  
        animeList.push(savedAnime);
      }
  
    } catch (error) {
      console.error('Error:', error);
    }
  
    return animeList;
  };
  