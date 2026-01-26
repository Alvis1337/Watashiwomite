import React from 'react';
import { Typography, Box, Stack, Checkbox, FormControlLabel } from '@mui/material';
import { SyncPreferences } from './types';

interface SyncOptionsSectionProps {
    selectedLists: SyncPreferences;
    updatePreferences: (prefs: Partial<SyncPreferences>) => void;
}

export const SyncOptionsSection: React.FC<SyncOptionsSectionProps> = ({
    selectedLists,
    updatePreferences,
}) => {
    const selectedCount = [
        selectedLists.watching,
        selectedLists.completed,
        selectedLists.on_hold,
        selectedLists.dropped,
        selectedLists.plan_to_watch
    ].filter(Boolean).length;

    return (
        <Box>
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.1rem' }}>
                Sync Options
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2.5, lineHeight: 1.6 }}>
                Additional sync preferences and behavior
            </Typography>
            <Stack spacing={2}>
                <Box sx={{
                    p: 2.5,
                    background: '#000000',
                    borderRadius: 3,
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
                }}>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700, mb: 0.5, fontSize: '0.9rem' }}>
                        Total Lists Selected
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                        {selectedCount} out of 5 lists will be synced
                    </Typography>
                </Box>
                <Box sx={{
                    p: 2.5,
                    background: '#000000',
                    borderRadius: 3,
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
                    position: 'relative',
                    '&::before': {
                        content: '"💡"',
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        fontSize: '1.2rem',
                        opacity: 0.6,
                    },
                }}>
                    <Typography variant="body2" sx={{ color: '#818cf8', fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem', textShadow: '0 0 10px rgba(129, 140, 248, 0.5)' }}>
                        Tip
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                        Enable Watching and Plan to Watch for best results. Completed and Dropped anime are usually not recommended for syncing.
                    </Typography>
                </Box>
                <Box sx={{
                    p: 2.5,
                    background: '#000000',
                    borderRadius: 3,
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    boxShadow: '0 0 30px rgba(245, 158, 11, 0.15)',
                    position: 'relative',
                    '&::before': {
                        content: '"⚡"',
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        fontSize: '1.2rem',
                        opacity: 0.6,
                    },
                }}>
                    <Typography variant="body2" sx={{ color: '#fbbf24', fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem', textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}>
                        Note
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                        Settings are saved automatically and applied immediately. Only anime from selected lists will be synced to Sonarr.
                    </Typography>
                </Box>
                <Box sx={{
                    p: 2.5,
                    background: '#000000',
                    borderRadius: 3,
                    border: selectedLists.searchForMissingEpisodes ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                    boxShadow: selectedLists.searchForMissingEpisodes ? '0 0 30px rgba(239, 68, 68, 0.15)' : '0 0 30px rgba(99, 102, 241, 0.15)',
                }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={selectedLists.searchForMissingEpisodes}
                                onChange={(e) => updatePreferences({ searchForMissingEpisodes: e.target.checked })}
                                sx={{
                                    color: 'rgba(239, 68, 68, 0.5)',
                                    '&.Mui-checked': {
                                        color: '#ef4444',
                                    },
                                }}
                            />
                        }
                        label={
                            <Box>
                                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', mb: 0.5 }}>
                                    Automatic Episode Search
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                                    When enabled, Sonarr will automatically search for missing episodes when anime is added.
                                    <Typography component="span" sx={{ color: '#ef4444', fontWeight: 600 }}> Warning: </Typography>
                                    This can overwhelm your indexers. Keep disabled unless you know what you're doing.
                                </Typography>
                            </Box>
                        }
                        sx={{ m: 0, alignItems: 'flex-start' }}
                    />
                </Box>
            </Stack>
        </Box>
    );
};
