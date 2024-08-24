import { tvdbLogin } from "./utils";

interface Anime {
    title: string;
}

export const getTvdbIds = async (animeList: Anime[], tvdbidApiKey: string) => {
    const tvdbIds = [];

    for (const animeTitle of animeList) {
        try {
            const tvdbToken = await tvdbLogin(tvdbidApiKey);
            const searchUrl = 'https://api4.thetvdb.com/v4/search?query=' + animeTitle.title + '&type=series&limit=1';
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
            tvdbIds.push({ title: animeTitle.title, tvdbId: tvdbId });
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(`Error fetching TVDB ID for ${animeTitle.title}: ${error.message}`);
            } else {
                console.error(`Unexpected error: ${String(error)}`);
            }
        }
    }

    return tvdbIds;
}
