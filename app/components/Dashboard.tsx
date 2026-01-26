"use client";

import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import DisplayAnimeList from './mal/DisplayAnimeList';
import DashboardHero from './dashboard/DashboardHero';
import DashboardLayout from './dashboard/DashboardLayout';
import SyncSettingsCard from './dashboard/SyncSettingsCard';
import { UnsyncDialog, SyncResultsDialog } from './dashboard/SyncDialogs';
import { Anime, SonarrSeries } from '../../types/interfaces';
import { toast } from 'react-hot-toast';
import { usePreferences } from '../hooks/usePreferences';

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
    const { logout } = useAuth();
    const [syncLoading, setSyncLoading] = useState(false);
    const [userData, setUser] = useState<UserData>();
    const [loading, setLoading] = useState(true);
    const [syncResults, setSyncResults] = useState<{title: string, success: boolean, reason?: string}[] | null>(null);
    const [showSyncResults, setShowSyncResults] = useState(false);
    const [showUnsyncDialog, setShowUnsyncDialog] = useState(false);
    const [unsyncedAnime, setUnsyncedAnime] = useState<Anime[]>([]);
    const [unsyncedListNames, setUnsyncedListNames] = useState<string[]>([]);

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
                }
            } catch (error) {
                console.error('[Dashboard] Auth check failed:', error);
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
    }, []);

    const checkAnimeList = useCallback(async (username: string) => {
        try {
            const response = await fetch(`/api/mal?username=${username}`)

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
            const response = await fetch(`/api/sonarr/database?username=${username}`)

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

    const performSync = useCallback(async (username: string, removeFromSonarr: boolean = false) => {
        setSyncLoading(true)
        setSyncResults(null);
        const toastId = toast.loading('Syncing your anime lists...');
        try {
            const url = `/api/sync/diff?username=${username}${removeFromSonarr ? '&removeUnsynced=true' : ''}`;
            const response = await fetch(url);
            const data = await response.json()
            if (data && response.ok) {
                setSyncLoading(false)

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
                console.error(data)
                toast.error(data.message || 'Failed to sync anime lists', { id: toastId });
                setSyncLoading(false)
            }
        } catch (e) {
            console.error(e)
            toast.error('Failed to sync anime lists', { id: toastId });
            setSyncLoading(false)
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

    const needSyncCount = useMemo(() => filteredAnimeList.length - inSyncCount, [filteredAnimeList, inSyncCount]);

    // For the deprecated Dashboard component, we'll just pass 0 for errorCount
    // since this component is kept for backward compatibility
    const errorCount = 0;

    return (
        <>
            {loading ? (
                <Grid2 container spacing={3} sx={{ padding: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                    <Grid2>
                        <CircularProgress
                            size={60}
                            sx={{
                                color: '#6366f1',
                                '& .MuiCircularProgress-circle': {
                                    strokeLinecap: 'round',
                                },
                            }}
                        />
                    </Grid2>
                </Grid2>
            ) : userData ? (
                <DashboardLayout userData={userData}>
                    <Box sx={{ width: '100%' }}>
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

                        {/* Settings Section - Always Visible */}
                        <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 3 }}>
                            <SyncSettingsCard
                                selectedLists={selectedLists}
                                updatePreferences={updatePreferences}
                                preferencesSaving={preferencesSaving}
                                userAnimeList={userAnimeList}
                                onSync={() => userData && syncMalWithSonarr(userData.name)}
                                syncLoading={syncLoading}
                            />
                        </Box>

                        {/* Anime Collection Section */}
                        <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 3 }}>
                            {loading ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="h6">Loading anime list...</Typography>
                                </Box>
                            ) : userAnimeList && userSonarrList ? (
                                <DisplayAnimeList animeList={filteredAnimeList} sonarrList={userSonarrList} syncResults={syncResults} />
                            ) : userAnimeList ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="body1">
                                        Loading Sonarr data...
                                    </Typography>
                                </Box>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="body1">
                                        {syncLoading ? 'Syncing your lists...' : 'Anime list will load automatically'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </DashboardLayout>
            ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1">Please log in to view your dashboard</Typography>
                </Box>
            )}

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
        </>
    );
};

export default Dashboard;
