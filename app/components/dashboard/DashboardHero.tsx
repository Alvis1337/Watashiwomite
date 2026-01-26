"use client";

import { Box, Typography, Stack, Avatar, Button } from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LogoutIcon from '@mui/icons-material/Logout';
import type { Anime, SonarrSeries } from '../../../types/interfaces';

interface UserData {
    id: number;
    name: string;
    location: string;
    joined_at: string;
    picture: string;
}

interface DashboardHeroProps {
    userData: UserData;
    userAnimeList: Anime[] | undefined;
    filteredAnimeList: Anime[];
    userSonarrList: SonarrSeries[] | undefined;
    inSyncCount: number;
    needSyncCount: number;
    errorCount: number;
    onLogout: () => void;
}

const StatCard = ({ label, value, color, icon, shouldPulse = false }: { label: string; value: number; color: string; icon: React.ReactNode; shouldPulse?: boolean }) => (
    <Box
        sx={{
            p: 3,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            border: `1px solid ${color}40`,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            animation: shouldPulse ? 'pulse 2s ease-in-out infinite' : 'none',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${color}40`,
            },
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: color,
                boxShadow: `0 0 20px ${color}`,
            },
            '@keyframes pulse': {
                '0%, 100%': {
                    boxShadow: `0 0 10px ${color}20`,
                },
                '50%': {
                    boxShadow: `0 0 20px ${color}60, 0 0 30px ${color}40`,
                },
            },
        }}
    >
        <Box sx={{ mb: 1 }}>{icon}</Box>
        <Typography variant="h3" sx={{ color, fontWeight: 800, mb: 0.5 }}>
            {value}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
            {label}
        </Typography>
    </Box>
);

function DashboardHero({
    userData,
    filteredAnimeList,
    inSyncCount,
    needSyncCount,
    errorCount,
    onLogout,
}: DashboardHeroProps) {
    return (
        <Box
            sx={{
                position: 'relative',
                minHeight: { xs: 'auto', md: '60vh' },
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                py: { xs: 4, md: 8 },
                px: { xs: 2, sm: 4, md: 6 },
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `url(${userData.picture})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(60px) brightness(0.3)',
                    transform: 'scale(1.2)',
                    zIndex: 0,
                }}
            />

            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
                    zIndex: 0,
                }}
            />

            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.8) 80%, #000000 100%)',
                    zIndex: 0,
                }}
            />

            <Grid2 container spacing={4} sx={{ position: 'relative', zIndex: 1, width: '100%' }}>
                <Grid2 size={12}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Avatar
                                src={userData.picture}
                                alt={userData.name}
                                sx={{
                                    width: { xs: 80, md: 120 },
                                    height: { xs: 80, md: 120 },
                                    border: '4px solid rgba(99, 102, 241, 0.5)',
                                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
                                }}
                            />

                            <Box>
                                <Typography
                                    variant="h2"
                                    sx={{
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, #ffffff 0%, #818cf8 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        mb: 1,
                                        fontSize: { xs: '2rem', md: '3rem' },
                                    }}
                                >
                                    {userData.name}
                                </Typography>
                                <Stack direction="row" spacing={2} flexWrap="wrap">
                                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                        ID: {userData.id}
                                    </Typography>
                                    {userData.location && (
                                        <>
                                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</Typography>
                                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                                📍 {userData.location}
                                            </Typography>
                                        </>
                                    )}
                                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                        Joined {new Date(userData.joined_at).toLocaleDateString()}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>

                        <Button
                            variant="outlined"
                            startIcon={<LogoutIcon />}
                            onClick={onLogout}
                            sx={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                '&:hover': {
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                },
                            }}
                        >
                            Logout
                        </Button>
                    </Stack>
                </Grid2>

                <Grid2 size={12}>
                    <Grid2 container spacing={3}>
                        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                            <StatCard
                                label="Total Anime"
                                value={filteredAnimeList.length}
                                color="#818cf8"
                                icon={<TrendingUpIcon sx={{ fontSize: 40, color: '#818cf8' }} />}
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                            <StatCard
                                label="Synced"
                                value={inSyncCount}
                                color="#4ade80"
                                icon={<CheckCircleIcon sx={{ fontSize: 40, color: '#4ade80' }} />}
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                            <StatCard
                                label="Need Sync"
                                value={needSyncCount}
                                color="#fbbf24"
                                icon={<WarningIcon sx={{ fontSize: 40, color: '#fbbf24' }} />}
                                shouldPulse={needSyncCount > 0}
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                            <StatCard
                                label="Errors"
                                value={errorCount}
                                color="#ef4444"
                                icon={<ErrorIcon sx={{ fontSize: 40, color: '#ef4444' }} />}
                                shouldPulse={errorCount > 0}
                            />
                        </Grid2>
                    </Grid2>
                </Grid2>
            </Grid2>
        </Box>
    );
}

export default DashboardHero;
