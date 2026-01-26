import React from 'react';
import { Typography, Box, Checkbox, FormControlLabel, FormGroup, Chip } from '@mui/material';
import { Anime } from '../../../../types/interfaces';
import { SyncPreferences } from './types';

interface ListSelectionSectionProps {
    selectedLists: SyncPreferences;
    updatePreferences: (prefs: Partial<SyncPreferences>) => void;
    userAnimeList: Anime[] | undefined;
}

export const ListSelectionSection: React.FC<ListSelectionSectionProps> = ({
    selectedLists,
    updatePreferences,
    userAnimeList,
}) => {
    return (
        <Box>
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.1rem' }}>
                MAL Lists to Sync
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2.5, lineHeight: 1.6 }}>
                Select which lists from your MyAnimeList profile should be synced to Sonarr
            </Typography>
            <FormGroup>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedLists.watching}
                            onChange={(e) => updatePreferences({ watching: e.target.checked })}
                            sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }}
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>Watching</Typography>
                            <Chip label="Recommended" size="small" sx={{ height: '20px', fontSize: '0.65rem', bgcolor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700 }} />
                            {userAnimeList && (
                                <Chip label={`${userAnimeList.filter(a => a.status === 'watching').length} anime`} size="small" sx={{ height: '20px', fontSize: '0.65rem', bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }} />
                            )}
                        </Box>
                    }
                    sx={{ mb: 1.5, ml: 0, alignItems: 'center' }}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedLists.completed}
                            onChange={(e) => updatePreferences({ completed: e.target.checked })}
                            sx={{ color: 'rgba(34, 197, 94, 0.5)', '&.Mui-checked': { color: '#22c55e' } }}
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>Completed</Typography>
                            {userAnimeList && (
                                <Chip label={`${userAnimeList.filter(a => a.status === 'completed').length} anime`} size="small" sx={{ height: '20px', fontSize: '0.65rem', bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }} />
                            )}
                        </Box>
                    }
                    sx={{ mb: 1.5, ml: 0, alignItems: 'center' }}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedLists.on_hold}
                            onChange={(e) => updatePreferences({ on_hold: e.target.checked })}
                            sx={{ color: 'rgba(245, 158, 11, 0.5)', '&.Mui-checked': { color: '#f59e0b' } }}
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>On Hold</Typography>
                            {userAnimeList && (
                                <Chip label={`${userAnimeList.filter(a => a.status === 'on_hold').length} anime`} size="small" sx={{ height: '20px', fontSize: '0.65rem', bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.7)' }} />
                            )}
                        </Box>
                    }
                    sx={{ mb: 1.5, ml: 0, alignItems: 'center' }}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedLists.plan_to_watch}
                            onChange={(e) => updatePreferences({ plan_to_watch: e.target.checked })}
                            sx={{ color: 'rgba(168, 85, 247, 0.5)', '&.Mui-checked': { color: '#a855f7' } }}
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>Plan to Watch</Typography>
                            {userAnimeList && (
                                <Chip label={`${userAnimeList.filter(a => a.status === 'plan_to_watch').length} anime`} size="small" sx={{ height: '20px', fontSize: '0.65rem', bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }} />
                            )}
                        </Box>
                    }
                    sx={{ mb: 1.5, ml: 0, alignItems: 'center' }}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedLists.dropped}
                            onChange={(e) => updatePreferences({ dropped: e.target.checked })}
                            sx={{ color: 'rgba(239, 68, 68, 0.5)', '&.Mui-checked': { color: '#ef4444' } }}
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>Dropped</Typography>
                            <Chip label="Not Recommended" size="small" sx={{ height: '20px', fontSize: '0.65rem', bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 700 }} />
                            {userAnimeList && (
                                <Chip label={`${userAnimeList.filter(a => a.status === 'dropped').length} anime`} size="small" sx={{ height: '20px', fontSize: '0.65rem', bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }} />
                            )}
                        </Box>
                    }
                    sx={{ mb: 0, ml: 0, alignItems: 'center' }}
                />
            </FormGroup>
        </Box>
    );
};
