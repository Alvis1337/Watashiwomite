import { Grid, Card, CardContent, CardMedia, Typography, Divider } from '@mui/material';

export interface Anime {
    id: number;
    title: string;
    malId: number;
    mainPictureMedium: string | null;
    mainPictureLarge: string | null;
    status: string;
    score: number | null;
    numEpisodesWatched: number | null;
    isRewatching: boolean;
    updatedAtMAL: Date | null;
    startDate: Date | null;
}

interface UserAnimeList {
    animeList: Anime[];
}

const DisplayAnimeList = ({ animeList }: UserAnimeList) => {
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
            </Grid>
            {animeList.map(anime => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={anime.id}>
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
                            minHeight: '325px'
                        }}
                    >
                        {anime.mainPictureLarge && (
                            <CardMedia
                                component="img"
                                image={anime.mainPictureLarge}
                                alt={anime.title}
                                sx={{ height: 140, objectFit: 'cover' }}
                            />
                        )}
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
                            {anime.score !== null && (
                                <Typography variant="body2" color="textSecondary">
                                    Score: {anime.score}
                                </Typography>
                            )}
                            {anime.numEpisodesWatched !== null && (
                                <Typography variant="body2" color="textSecondary">
                                    Episodes Watched: {anime.numEpisodesWatched}
                                </Typography>
                            )}
                            {anime.startDate && (
                                <Typography variant="body2" color="textSecondary">
                                    Start Date: {new Date(anime.startDate).toLocaleDateString()}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
};

export default DisplayAnimeList;
