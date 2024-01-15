import fs from 'fs';
import {promisify} from 'util';

const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);

export const deleteAllAvatars = async (absoluteFolderPath) => {
  try {
    const files = await readdir(absoluteFolderPath);
    const unlinkPromises = files.map((filename) => {
      if (!['avatar0.jpg', 'avatar1.jpg', 'avatar2.jpg'].includes(filename)) {
        console.log('Deleting avatar: ', filename);
        unlink(`${absoluteFolderPath}/${filename}`);
      }
    });
    return Promise.all(unlinkPromises);
  } catch (err) {
    console.log(err);
  }
};

export const isValidUrl = (str) => {
  var urlRegex =
    '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
};

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
  //     now sync them with sonarr at 192.168.20.22:8989
  const sonarrUrl = 'http://192.168.20.22:8989/api/series?apikey=48e9ab7124c04a4092f803bdd78916f2';
    const sonarrRequestBody = {
        "tvdbId": tvdbId,
        "title": animeTitle,
        "qualityProfileId": '1',
        "seriesType": "Anime",
        "seasonFolder": 'true',
        "monitored": 'true',
        "rootFolderPath": `/new_downloads/Anime/${animeTitle}`,
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