"use client";

import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';
import Navbar from '../components/Navbar';
import SyncSettingsCard from '../components/dashboard/SyncSettingsCard';
import { UnsyncDialog, SyncResultsDialog } from '../components/dashboard/SyncDialogs';
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

export default function SyncPage() {
    const [userAnimeList, setUserAnimeList] = useState<Anime[]>();
    const [userSonarrList, setUserSonarrList] = useState<SonarrSeries[]>();
    const { isAuthenticated, isLoading } = useAuth();
    const [syncLoading, setSyncLoading] = useState(false);
    const [userData, setUser] = useState<UserData>();
    const [loading, setLoading] = useState(true);
    const [syncResults, setSyncResults] = useState<{title: string, success: boolean, reason?: string}[] | null>(null);
    const [showSyncResults, setShowSyncResults] = useState(false);
    const [showUnsyncDialog, setShowUnsyncDialog] = useState(false);
    const [unsyncedAnime, setUnsyncedAnime] = useState<Anime[]>([]);
    const [unsyncedListNames, setUnsyncedListNames] = useState<string[]>([]);
    const router = useRouter();

    const {
        preferences: selectedLists,
        previousPreferences: previousLists,
        loaded: preferencesLoaded,
        saving: preferencesSaving,
        updatePreferences,
        commitChanges: commitPreferenceChanges,
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
                    console.error('[Sync] Not authenticated');
                    router.push('/');
                }
            } catch (error) {
                console.error('[Sync] Auth check failed:', error);
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
            console.error('[Sync] Failed to fetch anime list:', error);
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
            console.error('[Sync] Failed to fetch Sonarr list:', error);
            toast.error('Failed to load Sonarr series');
        }
    }, []);

    const performSync = useCallback(async (username: string, removeFromSonarr: boolean = false) => {
        setSyncLoading(true);
        setSyncResults(null);
        const toastId = toast.loading('Syncing your anime lists...');
        try {
            const url = `/api/sync/diff?username=${username}${removeFromSonarr ? '&removeUnsynced=true' : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data && response.ok) {
                setSyncLoading(false);

                commitPreferenceChanges();

                if (data.data?.results) {
                    setSyncResults(data.data.results);
                    const successCount = data.data.results.filter((r: any) => r.success).length;
                    const failCount = data.data.results.length - successCount;

                    if (failCount > 0) {
                        toast.success(`Synced! ${successCount} added, ${failCount} failed/skipped`, { id: toastId, duration: 5000 });
                        setShowSyncResults(true);
                    } else {
                        toast.success(`Successfully synced ${successCount} anime!`, { id: toastId });
                    }
                } else {
                    toast.success(data.message || 'Successfully synced anime lists!', { id: toastId });
                }

                await Promise.all([
                    checkAnimeList(username),
                    checkSonarrList(username)
                ]);
            } else {
                console.error(data);
                toast.error(data.message || 'Failed to sync anime lists', { id: toastId });
                setSyncLoading(false);
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to sync anime lists', { id: toastId });
            setSyncLoading(false);
        }
    }, [commitPreferenceChanges, checkAnimeList, checkSonarrList]);

    const syncMalWithSonarr = useCallback(async (username: string) => {
        const hasSelectedLists = Object.values(selectedLists).some(Boolean);
        const listNameMap: Record<string, string> = {
            watching: 'Watching',
            completed: 'Completed',
            on_hold: 'On Hold',
            dropped: 'Dropped',
            plan_to_watch: 'Plan to Watch',
        };

        if (!hasSelectedLists && userAnimeList && userSonarrList) {
            const syncedAnime = userAnimeList.filter(anime => {
                return userSonarrList.some(sonarr => sonarr.malId === anime.malId);
            });

            if (syncedAnime.length > 0) {
                setUnsyncedAnime(syncedAnime);
                setUnsyncedListNames(['All Lists']);
                setShowUnsyncDialog(true);
                return;
            }
        }

        const unsyncedLists: string[] = [];

        Object.keys(previousLists).forEach((key) => {
            const listKey = key as keyof typeof previousLists;
            if (previousLists[listKey] && !selectedLists[listKey]) {
                unsyncedLists.push(listKey);
            }
        });

        if (unsyncedLists.length > 0 && userAnimeList && userSonarrList) {
            const animeToRemove = userAnimeList.filter(anime => {
                const status = anime.status.toLowerCase().replace(/ /g, '_');
                const isInUnsyncedList = unsyncedLists.includes(status);
                const isInSonarr = userSonarrList.some(sonarr => sonarr.malId === anime.malId);
                return isInUnsyncedList && isInSonarr;
            });

            if (animeToRemove.length > 0) {
                setUnsyncedAnime(animeToRemove);
                setUnsyncedListNames(unsyncedLists.map(key => listNameMap[key as keyof typeof listNameMap]));
                setShowUnsyncDialog(true);
                return;
            }
        }

        performSync(username);
    }, [selectedLists, previousLists, userAnimeList, userSonarrList, performSync]);

    useEffect(() => {
        if (!userData || !preferencesLoaded || dataLoadedRef.current) {
            return;
        }

        const username = userData.name;
        dataLoadedRef.current = true;

        Promise.all([
            checkAnimeList(username),
            checkSonarrList(username)
        ]);
    }, [userData, preferencesLoaded, checkAnimeList, checkSonarrList]);

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
                        Sync Settings
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Choose which anime lists to sync with Sonarr
                    </Typography>
                </Box>

                {/* Sync Settings Card */}
                <SyncSettingsCard
                    selectedLists={selectedLists}
                    updatePreferences={updatePreferences}
                    preferencesSaving={preferencesSaving}
                    userAnimeList={userAnimeList}
                    onSync={() => userData && syncMalWithSonarr(userData.name)}
                    syncLoading={syncLoading}
                />
            </Box>

            <UnsyncDialog
                open={showUnsyncDialog}
                onClose={() => setShowUnsyncDialog(false)}
                unsyncedAnime={unsyncedAnime}
                unsyncedListNames={unsyncedListNames}
                onConfirm={(removeFromSonarr) => {
                    setShowUnsyncDialog(false);
                    if (userData) performSync(userData.name, removeFromSonarr);
                }}
            />

            <SyncResultsDialog
                open={showSyncResults}
                onClose={() => setShowSyncResults(false)}
                syncResults={syncResults}
            />
        </Box>
    );
}
