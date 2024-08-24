"use client"
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { Grid, Typography, Card, CardContent, CardMedia, Divider, Button } from '@mui/material';
import DisplayAnimeList from './mal/DisplayAnimeList';
import { Anime } from './mal/DisplayAnimeList';

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
    const { setAccessToken, logout } = useAuth();
    const [userData, setUser] = useState<UserData>({
        id: 1,
        name: '',
        location: '',
        joined_at: '',
        picture: '',
        authToken: ''
    });

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
        } else {
            return console.log('something wrong with endpoint')
        }
    }

    return (
        <>
            {userData ? (
                <Grid container spacing={3} sx={{ padding: 2, display: 'flex', justifyContent: 'center', alignContent: 'center' }}>
                    <Grid item xs={12} md={2}>
                        <Card>
                            <CardMedia
                                component="img"
                                height="140"
                                image={userData.picture}
                                alt={userData.name}
                            />
                            <CardContent>
                                <Typography variant="h5" component="div">
                                    {userData.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    ID: {userData.id}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Joined: {new Date(userData.joined_at).toLocaleDateString()}
                                </Typography>
                                {userData.location && (
                                    <Typography variant="body2" color="text.secondary">
                                        Location: {userData.location}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
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
                    <Grid item xs={5}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => checkAnimeList(userData.name)}
                        >
                            Get anime list
                        </Button>
                    </Grid>
                    {userAnimeList && (
                        <Grid item xs={12}>
                            <DisplayAnimeList animeList={userAnimeList} />
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
