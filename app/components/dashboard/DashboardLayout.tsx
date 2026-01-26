"use client";

import { ReactNode } from 'react';
import {
    Box,
    Fab,
    Zoom,
    useScrollTrigger,
    Tooltip,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardLayoutProps {
    children: ReactNode;
    userData?: {
        name: string;
        picture: string;
    };
}

function DashboardLayout({
    children,
    userData,
}: DashboardLayoutProps) {
    const trigger = useScrollTrigger({
        threshold: 100,
    });

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
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



            {/* Main Content Area */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: '100%',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {children}
            </Box>

            {/* Floating Action Buttons */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: { xs: 16, sm: 24 },
                    right: { xs: 16, sm: 24 },
                    zIndex: 1100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                <AnimatePresence>
                    {trigger && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Tooltip title="Back to Top" placement="left">
                                <Fab
                                    size="medium"
                                    onClick={scrollToTop}
                                    sx={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: 'white',
                                        '&:hover': {
                                            background: 'rgba(255, 255, 255, 0.15)',
                                        },
                                    }}
                                >
                                    <KeyboardArrowUpIcon />
                                </Fab>
                            </Tooltip>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </Box>
    );
}

export default DashboardLayout;
