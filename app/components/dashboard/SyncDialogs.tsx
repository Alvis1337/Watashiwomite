"use client";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Box,
    Button,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Chip,
    Stack,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CloseIcon from '@mui/icons-material/Close';
import { Anime } from '../../../types/interfaces';

interface UnsyncDialogProps {
    open: boolean;
    onClose: () => void;
    unsyncedAnime: Anime[];
    unsyncedListNames: string[];
    onConfirm: (removeFromSonarr: boolean) => void;
}

export const UnsyncDialog: React.FC<UnsyncDialogProps> = ({
    open,
    onClose,
    unsyncedAnime,
    unsyncedListNames,
    onConfirm,
}) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
                    border: '1px solid rgba(255, 152, 0, 0.3)',
                    borderRadius: 3,
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <WarningIcon sx={{ color: '#ffa726', fontSize: '28px' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                        Remove Anime from Sonarr?
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                {unsyncedListNames[0] === 'All Lists' ? (
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 2 }}>
                        You have unchecked <strong>all lists</strong>. This will remove everything from Sonarr.
                    </Typography>
                ) : (
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 2 }}>
                        You have unchecked the following list{unsyncedListNames.length > 1 ? 's' : ''}:
                    </Typography>
                )}

                {unsyncedListNames[0] !== 'All Lists' && (
                    <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                        {unsyncedListNames.map((listName, idx) => (
                            <Chip
                                key={idx}
                                label={listName}
                                sx={{
                                    bgcolor: 'rgba(255, 152, 0, 0.2)',
                                    color: '#ffa726',
                                    fontWeight: 600,
                                    border: '1px solid rgba(255, 152, 0, 0.4)',
                                }}
                            />
                        ))}
                    </Stack>
                )}

                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 2 }}>
                    {unsyncedListNames[0] === 'All Lists' ? (
                        <>
                            <strong>{unsyncedAnime.length}</strong> {unsyncedAnime.length === 1 ? 'item' : 'items'} that {unsyncedAnime.length === 1 ? 'was' : 'were'} previously synced will be removed from Sonarr.
                        </>
                    ) : (
                        <>
                            <strong>{unsyncedAnime.length}</strong> anime from {unsyncedAnime.length === 1 ? 'this list is' : 'these lists are'} currently in Sonarr.
                            Would you like to remove {unsyncedAnime.length === 1 ? 'it' : 'them'}?
                        </>
                    )}
                </Typography>

                <Box
                    sx={{
                        maxHeight: '300px',
                        overflow: 'auto',
                        bgcolor: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 2,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        p: 2,
                        mb: 3,
                    }}
                >
                    {unsyncedAnime.length === 0 ? (
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
                            No anime to remove
                        </Typography>
                    ) : (
                        <List sx={{ p: 0 }}>
                            {unsyncedAnime.map((anime, idx) => (
                                <ListItem key={anime.malId || idx} sx={{ py: 1, px: 0, borderBottom: idx < unsyncedAnime.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                        {anime.mainPictureMedium && (
                                            <Box
                                                component="img"
                                                src={anime.mainPictureMedium}
                                                alt={anime.title}
                                                sx={{
                                                    width: 40,
                                                    height: 56,
                                                    objectFit: 'cover',
                                                    borderRadius: 1,
                                                }}
                                            />
                                        )}
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', mb: 0.5 }}>
                                                {anime.title}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                                {anime.status}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            onClose();
                            onConfirm(false);
                        }}
                        sx={{
                            color: '#fff',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            '&:hover': {
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                            },
                        }}
                    >
                        No, Keep in Sonarr
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            onClose();
                            onConfirm(true);
                        }}
                        sx={{
                            background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                            color: 'white',
                            fontWeight: 600,
                            '&:hover': {
                                background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                            },
                        }}
                    >
                        {unsyncedListNames[0] === 'All Lists' ? 'Yes, Remove Everything' : 'Yes, Remove from Sonarr'}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

interface SyncResult {
    title: string;
    success: boolean;
    reason?: string;
}

interface SyncResultsDialogProps {
    open: boolean;
    onClose: () => void;
    syncResults: SyncResult[] | null;
}

export const SyncResultsDialog: React.FC<SyncResultsDialogProps> = ({
    open,
    onClose,
    syncResults,
}) => {
    return (
        <Dialog
            open={open && syncResults !== null}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
                    border: '1px solid rgba(255, 152, 0, 0.3)',
                    borderRadius: 3,
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ErrorIcon sx={{ color: '#ffa726', fontSize: '28px' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                        Sync Results
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                {syncResults && syncResults.filter(r => !r.success).length > 0 && (
                    <>
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 2 }}>
                            The following anime could not be synced:
                        </Typography>
                        <Box
                            sx={{
                                maxHeight: '400px',
                                overflow: 'auto',
                                bgcolor: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: 2,
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                p: 2,
                            }}
                        >
                            <List sx={{ p: 0 }}>
                                {syncResults.filter(r => !r.success).map((result, idx) => (
                                    <ListItem key={idx} sx={{ py: 1.5, px: 0, borderBottom: idx < syncResults.filter(r => !r.success).length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', mb: 0.5 }}>
                                                    {result.title}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography variant="caption" sx={{ color: '#ffa726' }}>
                                                    {result.reason || 'Unknown error'}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
