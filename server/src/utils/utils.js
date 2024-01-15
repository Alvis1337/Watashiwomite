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
  const sonarrUrl = `${process.env.SONARR_URL}/api/series?apikey=${process.env.SONARR_API_KEY}`;
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
    return await
            fetch(`${process.env.SONARR_URL}/api/series?apikey=${process.env.SONARR_API_KEY}`)
            .then(response => response.json())
            .then(data => {
                return data
            })
            .catch(error => console.error('Error:', error));
}

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
            // currently it looks like series-18294 we need to remove series-
            let tvdbId = data.data[0].id;
            tvdbId = tvdbId.replace('series-', '');
            tvdbIds.push({title: animeTitle.title, tvdbId: tvdbId});
        } catch (error) {
            console.error(`Error fetching TVDB ID for ${animeTitle.title}: ${error.message}`);
        }
    }

    return tvdbIds;
}

export const getMALAnimeList = async (token) => {
    const watchingUrl = 'https://api.myanimelist.net/v2/users/@me/animelist?status=watching&fields=list_status&limit=1000';
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

        data.data.forEach((item) => {
            animeList.push(item.node.title);
        });

    } catch (error) {
        console.error('Error:', error);
    }

    return animeList;
};

