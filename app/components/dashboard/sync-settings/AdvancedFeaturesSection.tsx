import React from 'react';
import {
    Typography,
    Box,
    Stack,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Slider,
    RadioGroup,
    Radio,
    Divider,
    TextField,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { SyncPreferences } from './types';

interface AdvancedFeaturesSectionProps {
    selectedLists: SyncPreferences;
    updatePreferences: (prefs: Partial<SyncPreferences>) => void;
}

export const AdvancedFeaturesSection: React.FC<AdvancedFeaturesSectionProps> = ({
    selectedLists,
    updatePreferences,
}) => {
    return (
        <Accordion
            sx={{
                background: '#000000',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                boxShadow: '0 0 30px rgba(99, 102, 241, 0.1)',
            }}
        >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#818cf8' }} />}>
                <Typography sx={{ color: '#818cf8', fontWeight: 700, fontSize: '0.9rem' }}>
                    🔥 Advanced Sync Features
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Stack spacing={2.5}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={selectedLists.alwaysPreviewBeforeSync}
                                onChange={(e) => updatePreferences({ alwaysPreviewBeforeSync: e.target.checked })}
                                sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }}
                            />
                        }
                        label={
                            <Box>
                                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                                    👀 Preview Before Sync
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                    Show what will be added/removed before syncing
                                </Typography>
                            </Box>
                        }
                        sx={{ m: 0, alignItems: 'flex-start' }}
                    />
                    <Divider sx={{ borderColor: 'rgba(99, 102, 241, 0.2)' }} />
                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedLists.enableSmartDuplicateDetection}
                                    onChange={(e) => updatePreferences({ enableSmartDuplicateDetection: e.target.checked })}
                                    sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }}
                                />
                            }
                            label={
                                <Box>
                                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                                        🎯 Smart Duplicate Detection
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                        Prevent adding similar titles (fuzzy matching)
                                    </Typography>
                                </Box>
                            }
                            sx={{ m: 0, alignItems: 'flex-start', mb: 1.5 }}
                        />
                        {selectedLists.enableSmartDuplicateDetection && (
                            <Box sx={{ pl: 4, pr: 2 }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem', mb: 0.5, display: 'block' }}>
                                    Match Sensitivity: {selectedLists.fuzzyMatchThreshold}%
                                </Typography>
                                <Slider
                                    value={selectedLists.fuzzyMatchThreshold}
                                    onChange={(_, value) => updatePreferences({ fuzzyMatchThreshold: value as number })}
                                    min={50}
                                    max={100}
                                    sx={{
                                        color: '#6366f1',
                                        '& .MuiSlider-thumb': { width: 16, height: 16 },
                                        '& .MuiSlider-track': { height: 4 },
                                        '& .MuiSlider-rail': { height: 4, opacity: 0.3 },
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(99, 102, 241, 0.2)' }} />
                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedLists.keepSyncHistory}
                                    onChange={(e) => updatePreferences({ keepSyncHistory: e.target.checked })}
                                    sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }}
                                />
                            }
                            label={
                                <Box>
                                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                                        ⏮️ Sync History & Rollback
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                        Keep history and ability to undo syncs
                                    </Typography>
                                </Box>
                            }
                            sx={{ m: 0, alignItems: 'flex-start', mb: 1 }}
                        />
                        {selectedLists.keepSyncHistory && (
                            <Box sx={{ pl: 4 }}>
                                <TextField
                                    type="number"
                                    label="Max History Entries"
                                    value={selectedLists.maxHistoryEntries}
                                    onChange={(e) => updatePreferences({ maxHistoryEntries: parseInt(e.target.value) || 10 })}
                                    size="small"
                                    inputProps={{ min: 1, max: 50 }}
                                    sx={{
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                            color: '#fff',
                                            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' },
                                            '&:hover fieldset': { borderColor: 'rgba(99, 102, 241, 0.5)' },
                                        },
                                        '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.5)' },
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(99, 102, 241, 0.2)' }} />
                    <Box>
                        <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', mb: 1 }}>
                            ⚔️ Sync Conflict Resolution
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', mb: 1.5, display: 'block' }}>
                            What happens when anime exists with different settings?
                        </Typography>
                        <RadioGroup
                            value={selectedLists.conflictResolution}
                            onChange={(e) => updatePreferences({ conflictResolution: e.target.value as any })}
                        >
                            <FormControlLabel value="skip" control={<Radio size="small" sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />} label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Skip existing anime</Typography>} />
                            <FormControlLabel value="mal-wins" control={<Radio size="small" sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />} label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>MAL wins (update Sonarr)</Typography>} />
                            <FormControlLabel value="sonarr-wins" control={<Radio size="small" sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />} label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Sonarr wins (keep current)</Typography>} />
                            <FormControlLabel value="ask-me" control={<Radio size="small" sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />} label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Ask me each time</Typography>} />
                        </RadioGroup>
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(99, 102, 241, 0.2)' }} />
                    <Box>
                        <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', mb: 1 }}>
                            ⚡ After Sync Actions
                        </Typography>
                        <FormGroup>
                            <FormControlLabel
                                control={<Checkbox size="small" checked={selectedLists.afterSyncRefreshMetadata} onChange={(e) => updatePreferences({ afterSyncRefreshMetadata: e.target.checked })} sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />}
                                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Refresh metadata from TVDB</Typography>}
                            />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={selectedLists.afterSyncSearchMissing} onChange={(e) => updatePreferences({ afterSyncSearchMissing: e.target.checked })} sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />}
                                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Search for newly added anime</Typography>}
                            />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={selectedLists.afterSyncBackupDatabase} onChange={(e) => updatePreferences({ afterSyncBackupDatabase: e.target.checked })} sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />}
                                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Backup correlation database</Typography>}
                            />
                        </FormGroup>
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(99, 102, 241, 0.2)' }} />
                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedLists.scoreBasedMonitoringEnabled}
                                    onChange={(e) => updatePreferences({ scoreBasedMonitoringEnabled: e.target.checked })}
                                    sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }}
                                />
                            }
                            label={
                                <Box>
                                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                                        🌟 Score-Based Monitoring
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                        Auto-monitor based on MAL score
                                    </Typography>
                                </Box>
                            }
                            sx={{ m: 0, alignItems: 'center', mb: 1.5 }}
                        />
                        {selectedLists.scoreBasedMonitoringEnabled && (
                            <Stack spacing={1} sx={{ pl: 4, pr: 2 }}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>
                                        High Score (Monitor All): {selectedLists.scoreHighThreshold}+
                                    </Typography>
                                    <Slider value={selectedLists.scoreHighThreshold} onChange={(_, v) => updatePreferences({ scoreHighThreshold: v as number })} min={1} max={10} sx={{ color: '#22c55e' }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>
                                        Med Score (Monitor New): {selectedLists.scoreMedThreshold}+
                                    </Typography>
                                    <Slider value={selectedLists.scoreMedThreshold} onChange={(_, v) => updatePreferences({ scoreMedThreshold: v as number })} min={1} max={10} sx={{ color: '#f59e0b' }} />
                                </Box>
                            </Stack>
                        )}
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(99, 102, 241, 0.2)' }} />
                    <Box>
                        <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', mb: 1 }}>
                            📅 Airing Status Intelligence
                        </Typography>
                        <FormGroup>
                            <FormControlLabel
                                control={<Checkbox size="small" checked={selectedLists.monitorOnlyCurrentSeason} onChange={(e) => updatePreferences({ monitorOnlyCurrentSeason: e.target.checked })} sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />}
                                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Monitor only current season</Typography>}
                            />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={selectedLists.ignoreCompletedSeries} onChange={(e) => updatePreferences({ ignoreCompletedSeries: e.target.checked })} sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />}
                                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Skip completed series</Typography>}
                            />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={selectedLists.prioritizeAiring} onChange={(e) => updatePreferences({ prioritizeAiring: e.target.checked })} sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />}
                                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Prioritize airing shows</Typography>}
                            />
                        </FormGroup>
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(99, 102, 241, 0.2)' }} />
                    <Box>
                        <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', mb: 1 }}>
                            📺 Episode Type Filtering
                        </Typography>
                        <FormGroup>
                            <FormControlLabel
                                control={<Checkbox size="small" checked={selectedLists.skipOVAs} onChange={(e) => updatePreferences({ skipOVAs: e.target.checked })} sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />}
                                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Skip OVAs</Typography>}
                            />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={selectedLists.skipSpecials} onChange={(e) => updatePreferences({ skipSpecials: e.target.checked })} sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />}
                                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Skip specials</Typography>}
                            />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={selectedLists.skipMovies} onChange={(e) => updatePreferences({ skipMovies: e.target.checked })} sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />}
                                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Skip movies</Typography>}
                            />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={selectedLists.onlyMainSeries} onChange={(e) => updatePreferences({ onlyMainSeries: e.target.checked })} sx={{ color: 'rgba(99, 102, 241, 0.5)', '&.Mui-checked': { color: '#6366f1' } }} />}
                                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>Only main series</Typography>}
                            />
                        </FormGroup>
                    </Box>
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
};
