"use client";

import { Typography, Card, CardContent, Box, Chip, CircularProgress, Button } from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import { Anime } from '@/types/interfaces';
import { SyncPreferences } from './sync-settings/types';
import { ListSelectionSection } from './sync-settings/ListSelectionSection';
import { SyncOptionsSection } from './sync-settings/SyncOptionsSection';
import { AdvancedFeaturesSection } from './sync-settings/AdvancedFeaturesSection';

interface SyncSettingsCardProps {
    selectedLists: SyncPreferences;
    updatePreferences: (prefs: Partial<SyncPreferences>) => void;
    preferencesSaving: boolean;
    userAnimeList: Anime[] | undefined;
    onSync?: () => void;
    syncLoading?: boolean;
}

const SyncSettingsCard: React.FC<SyncSettingsCardProps> = ({
    selectedLists,
    updatePreferences,
    preferencesSaving,
    userAnimeList,
    onSync,
    syncLoading = false,
}) => {
    return (
        <Grid2 size={12}>
            <Card sx={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}>
                <CardContent sx={{ p: 3 }}>
                    {/* ...existing code... */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                        <SettingsIcon sx={{ color: '#818cf8', fontSize: '28px' }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 0.5, letterSpacing: '-0.01em' }}>
                                Sync Settings
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem' }}>
                                Configure which anime lists to sync from MyAnimeList
                            </Typography>
                        </Box>
                        {preferencesSaving && (
                            <Chip
                                icon={<CircularProgress size={16} sx={{ color: '#90caf9 !important' }} />}
                                label="Saving..."
                                size="small"
                                sx={{
                                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                    color: '#818cf8',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    fontWeight: 600,
                                }}
                            />
                        )}
                    </Box>
                    <Grid2 container spacing={3}>
                        <Grid2 size={{ xs: 12, md: 6 }}>
                            <ListSelectionSection
                                selectedLists={selectedLists}
                                updatePreferences={updatePreferences}
                                userAnimeList={userAnimeList}
                            />
                        </Grid2>

                        <Grid2 size={{ xs: 12, md: 6 }}>
                            <SyncOptionsSection
                                selectedLists={selectedLists}
                                updatePreferences={updatePreferences}
                            />
                        </Grid2>

                        <Grid2 size={12}>
                            <AdvancedFeaturesSection
                                selectedLists={selectedLists}
                                updatePreferences={updatePreferences}
                            />
                        </Grid2>

                        {/* Sync Button */}
                        {onSync && (
                            <Grid2 size={12}>
                                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={syncLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SyncIcon />}
                                        onClick={onSync}
                                        disabled={syncLoading}
                                        sx={{
                                            minWidth: 200,
                                            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                                            color: 'white',
                                            fontWeight: 700,
                                            py: 1.5,
                                            px: 4,
                                            borderRadius: 3,
                                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                                            textTransform: 'none',
                                            fontSize: '1rem',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #4f46e5 0%, #db2777 100%)',
                                                boxShadow: '0 12px 32px rgba(99, 102, 241, 0.5)',
                                                transform: 'translateY(-2px)',
                                            },
                                            '&:disabled': {
                                                background: 'rgba(99, 102, 241, 0.3)',
                                                color: 'rgba(255, 255, 255, 0.5)',
                                            },
                                            transition: 'all 0.3s ease',
                                        }}
                                    >
                                        {syncLoading ? 'Syncing...' : 'Sync with Sonarr'}
                                    </Button>
                                </Box>
                            </Grid2>
                        )}
                    </Grid2>
                </CardContent>
            </Card>
        </Grid2>
    );
};

export default SyncSettingsCard;
