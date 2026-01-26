"use client";

import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';
import DisplayAnimeList from '../components/mal/DisplayAnimeList';
import DashboardHero from '../components/dashboard/DashboardHero';
import Navbar from '../components/Navbar';
import type { Anime, SonarrSeries } from '../../types/interfaces';
import { toast } from 'react-hot-toast';
import { usePreferences } from '../hooks/usePreferences';
import { useRouter } from 'next/navigation';

interface UserData {
    id: number;
    name: string;
    location: string;
    joined_at: string;
    picture: string;
    authToken: string;
}

export default function DashboardPage() {
    const [userAnimeList, setUserAnimeList] = useState<Anime[]>();
    const [userSonarrList, setUserSonarrList] = useState<SonarrSeries[]>();
    const [syncErrors, setSyncErrors] = useState<Array<{ malId: number; title: string; reason: string }>>([]);
    const { logout, isAuthenticated, isLoading } = useAuth();
    const [userData, setUser] = useState<UserData>();
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const {
        preferences: selectedLists,
        loaded: preferencesLoaded,
    } = usePreferences({
        username: userData?.name,
        enabled: !!userData,
    });

    const dataLoadedRef = useRef(false);

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
                    console.error('[Dashboard] Not authenticated');
                    router.push('/');
                }
            } catch (error) {
                console.error('[Dashboard] Auth check failed:', error);
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

    const checkAnimeList = useCallback(async (username: string) => {
        try {
            const response = await fetch(`/api/mal?username=${username}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data?.animeList) {
                setUserAnimeList(data.animeList);
            }
        } catch (error) {
            console.error('[Dashboard] Failed to fetch anime list:', error);
            toast.error('Failed to load your anime list');
        }
    }, []);

    const checkSonarrList = useCallback(async (username: string) => {
        try {
            const response = await fetch(`/api/sonarr/database?username=${username}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data && data.series) {
                setUserSonarrList(data.series);
            }
        } catch (error) {
            console.error('[Dashboard] Failed to fetch Sonarr list:', error);
            toast.error('Failed to load Sonarr series');
        }
    }, []);

    const fetchSyncErrors = useCallback(async (username: string) => {
        try {
            const response = await fetch(`/api/sync/errors?username=${username}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data && data.errors) {
                setSyncErrors(data.errors);
            }
        } catch (error) {
            console.error('[Dashboard] Failed to fetch sync errors:', error);
            // Don't show error toast - errors are optional
        }
    }, []);

    useEffect(() => {
        if (!userData || !preferencesLoaded || dataLoadedRef.current) {
            return;
        }

        const username = userData.name;
        dataLoadedRef.current = true;

        Promise.all([
            checkAnimeList(username),
            checkSonarrList(username),
            fetchSyncErrors(username),
        ]);
    }, [userData, preferencesLoaded, checkAnimeList, checkSonarrList, fetchSyncErrors]);

    const filteredAnimeList = useMemo(() => {
        if (!userAnimeList) return [];

        return userAnimeList.filter(anime => {
            const status = anime.status.toLowerCase().replace(/ /g, '_');
            return selectedLists[status as keyof typeof selectedLists] || false;
        });
    }, [userAnimeList, selectedLists]);

    const inSyncCount = useMemo(() => {
        if (!filteredAnimeList || !userSonarrList) return 0;
        const sonarrMap = new Map(userSonarrList.filter(s => s.malId).map(s => [s.malId, s]));
        return filteredAnimeList.filter(anime => anime.malId && sonarrMap.has(anime.malId)).length;
    }, [filteredAnimeList, userSonarrList]);

    // Count anime that have sync errors
    const errorCount = useMemo(() => {
        if (!filteredAnimeList || !syncErrors.length) return 0;
        const errorMalIds = new Set(syncErrors.map(e => e.malId));
        return filteredAnimeList.filter(anime => anime.malId && errorMalIds.has(anime.malId)).length;
    }, [filteredAnimeList, syncErrors]);

    // Need sync = not synced and not in error state
    const needSyncCount = useMemo(() => {
        const errorMalIds = new Set(syncErrors.map(e => e.malId));
        const notSynced = filteredAnimeList.filter(anime => {
            if (!anime.malId) return false;
            const sonarrMap = new Map(userSonarrList?.filter(s => s.malId).map(s => [s.malId, s]) || []);
            const isInSync = sonarrMap.has(anime.malId);
            const hasError = errorMalIds.has(anime.malId);
            return !isInSync && !hasError;
        });
        return notSynced.length;
    }, [filteredAnimeList, userSonarrList, syncErrors]);

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

            <Box sx={{ position: 'relative', zIndex: 1 }}>
                {/* Hero Section */}
                <DashboardHero
                    userData={userData}
                    userAnimeList={userAnimeList}
                    filteredAnimeList={filteredAnimeList}
                    userSonarrList={userSonarrList}
                    inSyncCount={inSyncCount}
                    needSyncCount={needSyncCount}
                    errorCount={errorCount}
                    onLogout={logout}
                />

                {/* Anime Collection Section */}
                <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 3 }}>
                    {loading ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="h6">Loading anime list...</Typography>
                        </Box>
                    ) : userAnimeList && userSonarrList ? (
                        <DisplayAnimeList animeList={filteredAnimeList} sonarrList={userSonarrList} />
                    ) : userAnimeList ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="body1">
                                Loading Sonarr data...
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="body1">
                                Loading your anime list...
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
