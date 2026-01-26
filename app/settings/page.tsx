"use client";

import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import {
    Typography,
    Box,
    CircularProgress,
    Card,
    CardContent,
    Button,
    Avatar,
    Divider,
    Alert,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import Navbar from '../components/Navbar';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useRouter } from 'next/navigation';

interface UserData {
    id: number;
    name: string;
    location: string;
    joined_at: string;
    picture: string;
    authToken: string;
}

export default function SettingsPage() {
    const { logout, isAuthenticated, isLoading } = useAuth();
    const [userData, setUser] = useState<UserData>();
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/');
            return;
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        let mounted = true;

        async function checkAuth() {
            try {
                setLoading(true);
                const response = await fetch('/api/auth/check');
                const data = await response.json();

                if (!mounted) return;

                if (data.isAuthenticated && data.user) {
                    setUser(data.user);
                } else {
                    console.error('[Settings] Not authenticated');
                    router.push('/');
                }
            } catch (error) {
                console.error('[Settings] Auth check failed:', error);
                router.push('/');
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        checkAuth();

        return () => {
            mounted = false;
        };
    }, [router]);

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    if (loading || isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    background: '#000000',
                }}
            >
                <CircularProgress
                    size={60}
                    sx={{
                        color: '#6366f1',
                        '& .MuiCircularProgress-circle': {
                            strokeLinecap: 'round',
                        },
                    }}
                />
            </Box>
        );
    }

    if (!userData) {
        return null;
    }

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <Box sx={{ minHeight: '100vh' }}>
            <Navbar userData={userData} />

            {/* Animated Background */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />

            <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
                {/* Page Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1,
                        }}
                    >
                        Settings
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Manage your account and preferences
                    </Typography>
                </Box>

                <Grid2 container spacing={3}>
                    {/* Profile Card */}
                    <Grid2 size={{ xs: 12, md: 6 }}>
                        <Card
                            sx={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 3,
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 600,
                                        mb: 3,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <PersonIcon /> Profile Information
                                </Typography>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <Avatar
                                        src={userData.picture}
                                        alt={userData.name}
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            border: '3px solid',
                                            borderColor: '#6366f1',
                                        }}
                                    />
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {userData.name}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                            MyAnimeList User
                                        </Typography>
                                    </Box>
                                </Box>

                                <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {userData.location && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LocationOnIcon sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.6)' }} />
                                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                {userData.location}
                                            </Typography>
                                        </Box>
                                    )}

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CalendarTodayIcon sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.6)' }} />
                                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                            Joined {formatDate(userData.joined_at)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid2>

                    {/* Account Actions Card */}
                    <Grid2 size={{ xs: 12, md: 6 }}>
                        <Card
                            sx={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 3,
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 600,
                                        mb: 3,
                                    }}
                                >
                                    Account Actions
                                </Typography>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Alert
                                        severity="info"
                                        sx={{
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            '& .MuiAlert-icon': {
                                                color: '#6366f1',
                                            },
                                        }}
                                    >
                                        Your account is linked to MyAnimeList
                                    </Alert>

                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<LogoutIcon />}
                                        onClick={handleLogout}
                                        fullWidth
                                        sx={{
                                            mt: 2,
                                            borderRadius: 2,
                                            py: 1.5,
                                            textTransform: 'none',
                                            fontSize: '1rem',
                                        }}
                                    >
                                        Logout
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid2>

                    {/* App Information Card */}
                    <Grid2 size={{ xs: 12 }}>
                        <Card
                            sx={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 3,
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 600,
                                        mb: 2,
                                    }}
                                >
                                    About Watashiwomite
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                                    Watashiwomite automatically syncs your MyAnimeList watching lists with Sonarr for seamless anime library management.
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    Version 1.0.0 • Licensed under UNLICENSE
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid2>
                </Grid2>
            </Box>
        </Box>
    );
}
