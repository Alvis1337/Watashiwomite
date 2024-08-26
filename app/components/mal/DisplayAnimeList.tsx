import { Grid, Card, CardContent, CardMedia, Typography, Divider } from '@mui/material';
import { Anime, SonarrSeries } from '../../../types/interfaces';

interface AnimeListData {
    animeList: Anime[];
    sonarrList: SonarrSeries[]; 
}

const DisplayAnimeList: React.FC<AnimeListData> = ({ animeList, sonarrList }) => {
    const sonarrMap = new Map<number, SonarrSeries>();
    if (Array.isArray(sonarrList)) {
        sonarrList.forEach(series => {
            if (series.malId) {
                sonarrMap.set(series.malId, series);
            }
        });
    } else {
        console.error('sonarrList is not an array', sonarrList);
    }

    const totalAnime = animeList.length;
    const inSyncCount = animeList.filter(anime => anime.malId && sonarrMap.has(anime.malId)).length;


    return (
        <Grid
            container
            spacing={3}
            sx={{
                padding: 3,
                borderRadius: 2,
                boxShadow: 2,
            }}
        >
            <Grid item xs={12}>
                <Typography
                    variant="h4"
                    align="center"
                >
                    My Anime List
                </Typography>
                <Typography
                    variant="subtitle1"
                    align="center"
                    sx={{ marginY: 2 }}
                >
                    {inSyncCount} in sync out of {totalAnime}
                </Typography>
            </Grid>
            {animeList.map((anime, index) => {
                const isInSync = anime.malId && sonarrMap.has(anime.malId);
                const sonarrSeries = isInSync ? sonarrMap.get(anime.malId) : null;

                return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                        <Card
                            sx={{
                                borderRadius: 2,
                                boxShadow: 1,
                                overflow: 'hidden',
                                '&:hover': {
                                    boxShadow: 3,
                                    transform: 'scale(1.02)',
                                    transition: 'transform 0.3s ease',
                                },
                                minHeight: '400px'
                            }}
                        >
                                <CardMedia
                                    component="img"
                                    image={anime.mainPictureLarge?.toString()}
                                    alt={anime.title}
                                    sx={{ height: 140, objectFit: 'cover' }}
                                />
                            <CardContent>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 'bold', marginBottom: 1 }}
                                >
                                    {anime.title}
                                </Typography>
                                <Divider sx={{ marginY: 1 }} />
                                <Typography variant="body2" color="textSecondary">
                                    Status: {anime.status}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    MalId: {anime.malId}
                                </Typography>
                                {anime.numEpisodesWatched !== null && (
                                    <Typography variant="body2" color="textSecondary">
                                        Episodes Watched: {anime.numEpisodesWatched}
                                    </Typography>
                                )}
                                <Divider sx={{ marginY: 1 }} />
                                <Typography variant="body2" color={isInSync ? 'success.main' : 'error.main'}>
                                    {isInSync ? 'In Sync with Sonarr' : 'Not in Sync with Sonarr'}
                                </Typography>
                                {isInSync && sonarrSeries && (
                                    <>
                                        <Typography variant="body2" color="textSecondary">
                                            Sonarr Title: {sonarrSeries.title}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Sonarr Status: {sonarrSeries.status}
                                        </Typography>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default DisplayAnimeList;
