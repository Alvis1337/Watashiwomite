[![wakatime](https://wakatime.com/badge/user/75eea31e-013e-4c76-b26f-3e941e9e6acc/project/018d0b2b-74b2-45bd-b5e6-41eddbd5a4a4.svg)](https://wakatime.com/badge/user/75eea31e-013e-4c76-b26f-3e941e9e6acc/project/018d0b2b-74b2-45bd-b5e6-41eddbd5a4a4)

# Watashiwomite (Watchme) [MERN]
MAL integration for Sonarr that will grab all of shows you have marked as "Watching" on MAL and add them as a series to Sonarr and start searching for missing episodes.

## Running the server
```
cd server
npm install
npm run server
```

## Running the client
### You do need mongodb on your system
```
cd client
npm install
npm run dev
```

## Instructions for syncing your MAL list with Sonarr
1. Fill out necessary environment variables
2. Navigate to `http://localhost:5173`
3. Click the "Do OAuth" button
4. Click the "Sync Watchlist" button
5. Click the "Sync Sonarr With Mal" button

## Configuration
The server will run on port 5001 by default. You can change this by setting the `PORT` environment variable.

### Sonarr
You will need to set the following environment variables for Sonarr:
API_KEY: Your Sonarr API key
SONARR_URL: The URL to your Sonarr instance

### MyAnimeList
You will need to set the following environment variables for MyAnimeList:
MAL_USERNAME: Your MAL username
MAL_PASSWORD: Your MAL password
MAL_CLIENT_ID: Your MAL client ID
MAL_CLIENT_SECRET: Your MAL client secret

## TODO
- [ ] add env vars for all Sonarr options for series, they are currently hardcoded
- [ ] do check for existing series before adding
- [ ] support for movies from MAL

## License
MIT

