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
    TextField,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import Navbar from '../components/Navbar';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface UserData {
    id: number;
    name: string;
    location: string;
    joined_at: string;
    picture: string;
    authToken: string;
}

interface AppSettings {
    malClientId: string;
    malClientSecret: string;
    malRedirectUri: string;
    sonarrUrl: string;
    sonarrApiKey: string;
    tvdbApiKey: string;
}

export default function SettingsPage() {
    const { logout, isAuthenticated, isLoading } = useAuth();
    const [userData, setUser] = useState<UserData>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const router = useRouter();
    
    const [appSettings, setAppSettings] = useState<AppSettings>({
        malClientId: '',
        malClientSecret: '',
        malRedirectUri: '',
        sonarrUrl: '',
        sonarrApiKey: '',
        tvdbApiKey: '',
    });

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
                    await loadSettings();
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

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/settings');
            const data = await response.json();
            if (response.ok && data.settings) {
                setAppSettings(data.settings);
            }
        } catch (error) {
            console.error('[Settings] Failed to load settings:', error);
        }
    };

    const handleSettingsChange = (field: keyof AppSettings) => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setAppSettings({ ...appSettings, [field]: event.target.value });
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appSettings),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Settings saved successfully!');
            } else {
                toast.error(data.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestSonarrConnection = async () => {
        try {
            const response = await fetch(`${appSettings.sonarrUrl}/api/v3/system/status`, {
                headers: {
                    'X-Api-Key': appSettings.sonarrApiKey,
                },
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Connected to Sonarr v${data.version}!`);
            } else if (response.status === 401) {
                toast.error('Invalid Sonarr API Key (401 Unauthorized)');
            } else {
                toast.error(`Sonarr connection failed: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Sonarr test failed:', error);
            toast.error('Failed to connect to Sonarr. Check URL and ensure Sonarr is running.');
        }
    };

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

                    {/* App Configuration Card */}
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
                                        mb: 3,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <SettingsIcon /> Application Configuration
                                </Typography>

                                <Accordion
                                    sx={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        mb: 2,
                                    }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography>MAL OAuth Settings</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <TextField
                                            label="MAL Client ID"
                                            value={appSettings.malClientId}
                                            onChange={handleSettingsChange('malClientId')}
                                            fullWidth
                                            size="small"
                                        />
                                        <TextField
                                            label="MAL Client Secret"
                                            value={appSettings.malClientSecret}
                                            onChange={handleSettingsChange('malClientSecret')}
                                            type="password"
                                            fullWidth
                                            size="small"
                                        />
                                        <TextField
                                            label="MAL Redirect URI"
                                            value={appSettings.malRedirectUri}
                                            onChange={handleSettingsChange('malRedirectUri')}
                                            fullWidth
                                            size="small"
                                        />
                                    </AccordionDetails>
                                </Accordion>

                                <Accordion
                                    sx={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        mb: 2,
                                    }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography>Sonarr Settings</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <TextField
                                            label="Sonarr URL"
                                            value={appSettings.sonarrUrl}
                                            onChange={handleSettingsChange('sonarrUrl')}
                                            placeholder="http://localhost:8989"
                                            fullWidth
                                            size="small"
                                        />
                                        <TextField
                                            label="Sonarr API Key"
                                            value={appSettings.sonarrApiKey}
                                            onChange={handleSettingsChange('sonarrApiKey')}
                                            type="password"
                                            fullWidth
                                            size="small"
                                        />
                                        <Button
                                            variant="outlined"
                                            onClick={handleTestSonarrConnection}
                                            size="small"
                                            sx={{ mt: 1 }}
                                        >
                                            Test Connection
                                        </Button>
                                    </AccordionDetails>
                                </Accordion>

                                <Accordion
                                    sx={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography>TVDB Settings</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <TextField
                                            label="TVDB API Key"
                                            value={appSettings.tvdbApiKey}
                                            onChange={handleSettingsChange('tvdbApiKey')}
                                            type="password"
                                            fullWidth
                                            size="small"
                                        />
                                    </AccordionDetails>
                                </Accordion>

                                <Button
                                    variant="contained"
                                    onClick={handleSaveSettings}
                                    disabled={saving}
                                    fullWidth
                                    sx={{
                                        mt: 3,
                                        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                                        textTransform: 'none',
                                        py: 1.5,
                                    }}
                                >
                                    {saving ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Save Configuration'}
                                </Button>
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
