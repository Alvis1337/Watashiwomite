"use client"
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { Grid, Typography, Card, CardContent, CardMedia, Button, CardActionArea, CardActions } from '@mui/material';
import DisplayAnimeList from './mal/DisplayAnimeList';
import { Anime, SonarrSeries } from '../../types/interfaces';

interface UserData {
    id: number;
    name: string;
    location: string;
    joined_at: string;
    picture: string;
    authToken: string;
}

const Dashboard = () => {
    const [userAnimeList, setUserAnimeList] = useState<Anime[]>()
    const [userSonarrList, setUserSonarrList] = useState<SonarrSeries[]>();
    const { setAccessToken, logout } = useAuth();
    const [synced, setSynced] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [userData, setUser] = useState<UserData>();
    const [animeListLoading, setAnimeListLoading] = useState(false);

    useEffect(() => {
        async function checkAuth() {
            const response = await fetch('/api/auth/check');
            const data = await response.json();
            if (data.isAuthenticated) {
                setUser(data.user);
            } else {
                setUser({
                    id: 1,
                    name: '',
                    location: '',
                    joined_at: '',
                    picture: '',
                    authToken: ''
                });
            }
        }

        checkAuth();
    }, [setAccessToken]);

    async function checkAnimeList(username: string) {
        const response = await fetch(`/api/mal?username=${username}`)
        const data = await response.json();
        if (data) {
            setUserAnimeList(data.animeList)
            setAnimeListLoading(true)
        } else {
            return console.log(data)
        }
    }

    async function checkSonarrList(username: string) {
        const response = await fetch(`/api/sonarr/database?username=${username}`)
        const data = await response.json();
        if (data) {
            setUserSonarrList(data.series)
        } else {
            return console.log('no data in sonarr response')
        }
    }

    const syncMalWithSonarr = async (username: string) => {
        setSyncLoading(true)
        try {
            const response = await fetch(`/api/sync/diff?username=${username}`)
            const data = await response.json()
            if (data) {
                setSynced(true)
                setSyncLoading(false)
            } else {
                console.error(data)
            }
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        if (userData && !animeListLoading && !synced && !syncLoading) {
            const username = userData.name
            checkAnimeList(username)
            syncMalWithSonarr(username)
        }
    }, [userData])

    useEffect(() => {
        if (userData) {
            checkSonarrList(userData.name)
        }
    }, [synced])


    return (
        <>
            {userData ? (
                <Grid container spacing={3} sx={{ padding: 2, display: 'flex', justifyContent: 'center', alignContent: 'center' }}>
                    <Grid item xs={12} md={2} sx={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    alignContent: 'center'
                                }}>
                        <Card sx={{
                                    minWidth: '280x'
                                }}>
                            <CardMedia
                                component="img"
                                height="140"
                                image={userData.picture}
                                alt={userData.name}
                            />
                            <CardContent>
                                <Typography variant="h5" component="div" textAlign={'center'}>
                                    {userData.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" textAlign={'center'}>
                                    ID: {userData.id}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" textAlign={'center'}>
                                    Joined: {new Date(userData.joined_at).toLocaleDateString()}
                                </Typography>
                                {userData.location && (
                                    <Typography variant="body2" color="text.secondary" textAlign={'center'}>
                                        Location: {userData.location}
                                    </Typography>
                                )}
                                <Grid container sx={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    alignContent: 'center',
                                    pt: '1rem'
                                }}>
                                    <Grid item xs={5}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={logout}
                                        >
                                            Sync
                                        </Button>
                                    </Grid>

                                    <Grid item xs={5}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={logout}
                                        >
                                            Logout
                                        </Button>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {userAnimeList && userSonarrList && (
                        <Grid item xs={12}>
                            <DisplayAnimeList animeList={userAnimeList} sonarrList={userSonarrList} />
                        </Grid>
                    )}
                </Grid >
            ) : (
                <Grid container>
                    <Typography variant='body1'>
                        Please log in
                    </Typography>
                </Grid>
            )}
        </>
    );
};

export default Dashboard;
