"use client";

import {
    Typography,
    Card,
    CardContent,
    CardMedia,
    Button,
    Box,
    Stack,
    Chip,
    Divider,
    CircularProgress,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import SyncIcon from '@mui/icons-material/Sync';
import { Anime, SonarrSeries } from '../../../types/interfaces';

interface UserData {
    id: number;
    name: string;
    location: string;
    joined_at: string;
    picture: string;
    authToken: string;
}

interface UserProfileCardProps {
    userData: UserData;
    userAnimeList: Anime[] | undefined;
    filteredAnimeList: Anime[];
    userSonarrList: SonarrSeries[] | undefined;
    inSyncCount: number;
    needSyncCount: number;
    syncProgress: number;
    syncLoading: boolean;
    onSync: () => void;
    onLogout: () => void;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
    userData,
    userAnimeList,
    filteredAnimeList,
    inSyncCount,
    needSyncCount,
    syncProgress,
    syncLoading,
    onSync,
    onLogout,
}) => {
    return (
        <Grid2 size={12}>
            <Card sx={{
                background: '#000000',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 60px rgba(99, 102, 241, 0.15)',
                position: 'relative',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #6366f1, #ec4899, transparent)',
                },
            }}>
                <Grid2 container>
                    <Grid2 size={{ xs: 12, md: 4 }}>
                        <Box sx={{ position: 'relative', height: '100%', minHeight: '300px' }}>
                            <CardMedia
                                component="img"
                                image={userData.picture}
                                alt={userData.name}
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    filter: 'brightness(0.6) saturate(1.2)',
                                }}
                            />
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%)',
                            }} />
                            <Box sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.98) 0%, transparent 100%)',
                                p: 3,
                            }}>
                                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1, letterSpacing: '-0.01em' }}>
                                    {userData.name}
                                </Typography>
                                <Stack direction="row" spacing={2} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>ID: {userData.id}</Typography>
                                    <Typography variant="body2">•</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                        Joined: {new Date(userData.joined_at).toLocaleDateString()}
                                    </Typography>
                                </Stack>
                                {userData.location && (
                                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 0.5, fontSize: '0.85rem' }}>
                                        📍 {userData.location}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Grid2>

                    <Grid2 size={{ xs: 12, md: 8 }}>
                        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ mb: 2 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        mb: 0.5,
                                        fontSize: '1.5rem',
                                        letterSpacing: '-0.01em',
                                    }}
                                >
                                    My Anime Collection
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem' }}>
                                    Your anime synchronization status
                                </Typography>
                            </Box>

                            <Divider sx={{ borderColor: 'rgba(99, 102, 241, 0.2)', mb: 3 }} />

                            {!userAnimeList ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                                    <CircularProgress size={40} sx={{ color: '#6366f1' }} />
                                </Box>
                            ) : (
                                <>
                                    <Grid2 container spacing={2} sx={{ mb: 3 }}>
                                        <Grid2 size={{ xs: 12, sm: 4 }}>
                                            <Box sx={{
                                                p: 2.5,
                                                background: '#000000',
                                                borderRadius: 3,
                                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                                textAlign: 'center',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                boxShadow: '0 0 30px rgba(99, 102, 241, 0.2)',
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: '2px',
                                                    background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
                                                },
                                            }}>
                                                <Typography variant="h4" sx={{ color: '#818cf8', fontWeight: 800, mb: 0.5, textShadow: '0 0 20px rgba(129, 140, 248, 0.5)' }}>
                                                    {filteredAnimeList.length}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                                    Total Anime
                                                </Typography>
                                            </Box>
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 4 }}>
                                            <Box sx={{
                                                p: 2.5,
                                                background: '#000000',
                                                borderRadius: 3,
                                                border: '1px solid rgba(34, 197, 94, 0.4)',
                                                textAlign: 'center',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                boxShadow: '0 0 30px rgba(34, 197, 94, 0.2)',
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: '2px',
                                                    background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
                                                },
                                            }}>
                                                <Typography variant="h4" sx={{ color: '#4ade80', fontWeight: 800, mb: 0.5, textShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}>
                                                    {inSyncCount}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                                    Synced
                                                </Typography>
                                            </Box>
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 4 }}>
                                            <Box sx={{
                                                p: 2.5,
                                                background: '#000000',
                                                borderRadius: 3,
                                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                                textAlign: 'center',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                boxShadow: '0 0 30px rgba(245, 158, 11, 0.2)',
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: '2px',
                                                    background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
                                                },
                                            }}>
                                                <Typography variant="h4" sx={{ color: '#fbbf24', fontWeight: 800, mb: 0.5, textShadow: '0 0 20px rgba(251, 191, 36, 0.5)' }}>
                                                    {needSyncCount}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                                    Need Sync
                                                </Typography>
                                            </Box>
                                        </Grid2>
                                    </Grid2>

                                    <Box sx={{
                                        mb: 3,
                                        p: 2.5,
                                        background: 'rgba(0, 0, 0, 0.5)',
                                        borderRadius: 3,
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
                                            Completion Status
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" sx={{
                                                color: syncProgress === 100 ? '#4ade80' : syncProgress > 50 ? '#fbbf24' : '#ef4444',
                                                fontWeight: 800,
                                                textShadow: syncProgress === 100 ? '0 0 20px rgba(74, 222, 128, 0.5)' : syncProgress > 50 ? '0 0 20px rgba(251, 191, 36, 0.5)' : '0 0 20px rgba(239, 68, 68, 0.5)',
                                            }}>
                                                {syncProgress}%
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                synced
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: 1, mt: 2 }}>
                                        <Chip
                                            icon={<CheckCircleIcon />}
                                            label={`${inSyncCount} Synced`}
                                            sx={{
                                                bgcolor: 'rgba(34, 197, 94, 0.15)',
                                                color: '#4ade80',
                                                fontWeight: 700,
                                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                                '& .MuiChip-icon': { color: '#4ade80' },
                                            }}
                                        />
                                        <Chip
                                            icon={<WarningIcon />}
                                            label={`${needSyncCount} Need Sync`}
                                            sx={{
                                                bgcolor: 'rgba(245, 158, 11, 0.15)',
                                                color: '#fbbf24',
                                                fontWeight: 700,
                                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                                '& .MuiChip-icon': { color: '#fbbf24' },
                                            }}
                                        />
                                    </Stack>

                                    <Box sx={{ display: 'flex', gap: 2, mt: 'auto', pt: 3 }}>
                                        <Button
                                            variant="contained"
                                            startIcon={syncLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SyncIcon />}
                                            onClick={onSync}
                                            disabled={syncLoading}
                                            sx={{
                                                flex: 1,
                                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                color: 'white',
                                                fontWeight: 700,
                                                py: 1.5,
                                                px: 4,
                                                borderRadius: 3,
                                                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: '-100%',
                                                    width: '100%',
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                                                    transition: 'left 0.5s',
                                                },
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                                                    boxShadow: '0 12px 32px rgba(99, 102, 241, 0.5)',
                                                    transform: 'translateY(-2px)',
                                                    '&::before': { left: '100%' },
                                                },
                                                '&:disabled': {
                                                    background: 'rgba(99, 102, 241, 0.3)',
                                                    color: 'rgba(255, 255, 255, 0.5)',
                                                },
                                                transition: 'all 0.3s ease',
                                            }}
                                        >
                                            {syncLoading ? 'Syncing...' : 'Sync Now'}
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={onLogout}
                                            sx={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                color: 'rgba(255, 255, 255, 0.9)',
                                                fontWeight: 600,
                                                py: 1.5,
                                                px: 4,
                                                borderRadius: 3,
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                backdropFilter: 'blur(10px)',
                                                '&:hover': {
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                                    transform: 'translateY(-2px)',
                                                },
                                                transition: 'all 0.3s ease',
                                            }}
                                        >
                                            Logout
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </CardContent>
                    </Grid2>
                </Grid2>
            </Card>
        </Grid2>
    );
};

export default UserProfileCard;
