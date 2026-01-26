"use client";

import { useState } from 'react';
import {
    AppBar,
    Toolbar,
    Box,
    Button,
    IconButton,
    Avatar,
    Menu,
    MenuItem,
    Typography,
    useTheme,
    useMediaQuery,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SyncIcon from '@mui/icons-material/Sync';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
    userData?: {
        name: string;
        picture: string;
    };
}

export default function Navbar({ userData }: NavbarProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuth();

    const navItems = [
        { label: 'Your List', path: '/dashboard', icon: <DashboardIcon /> },
        { label: 'Sync', path: '/sync', icon: <SyncIcon /> },
        { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    ];

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        handleProfileMenuClose();
        await logout();
        router.push('/');
    };

    const handleNavigation = (path: string) => {
        router.push(path);
        setMobileMenuOpen(false);
    };

    if (!userData) return null;

    return (
        <>
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    {/* Logo/Brand */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                            onClick={() => handleNavigation('/dashboard')}
                        >
                            Watashiwomite
                        </Typography>
                    </Box>

                    {/* Desktop Navigation */}
                    {!isMobile && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {navItems.map((item) => (
                                <Button
                                    key={item.path}
                                    onClick={() => handleNavigation(item.path)}
                                    startIcon={item.icon}
                                    sx={{
                                        color: pathname === item.path ? '#6366f1' : 'rgba(255, 255, 255, 0.7)',
                                        position: 'relative',
                                        '&:hover': {
                                            color: '#6366f1',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                        },
                                        '&::after': pathname === item.path ? {
                                            content: '""',
                                            position: 'absolute',
                                            bottom: 0,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: '60%',
                                            height: '2px',
                                            background: 'linear-gradient(90deg, #6366f1 0%, #ec4899 100%)',
                                            borderRadius: '2px',
                                        } : {},
                                    }}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </Box>
                    )}

                    {/* User Profile */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isMobile && (
                            <IconButton
                                onClick={() => setMobileMenuOpen(true)}
                                sx={{ color: 'white' }}
                            >
                                <MenuIcon />
                            </IconButton>
                        )}
                        <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0 }}>
                            <Avatar
                                src={userData.picture}
                                alt={userData.name}
                                sx={{
                                    width: 40,
                                    height: 40,
                                    border: '2px solid',
                                    borderColor: pathname === '/dashboard' || pathname === '/sync' || pathname === '/settings'
                                        ? '#6366f1'
                                        : 'rgba(255, 255, 255, 0.2)',
                                }}
                            />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Profile Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
                slotProps={{
                    paper: {
                        sx: {
                            background: 'rgba(30, 30, 30, 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            mt: 1,
                        },
                    },
                }}
            >
                <MenuItem disabled>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {userData.name}
                    </Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                    Logout
                </MenuItem>
            </Menu>

            {/* Mobile Drawer */}
            <Drawer
                anchor="right"
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                slotProps={{
                    paper: {
                        sx: {
                            background: 'rgba(0, 0, 0, 0.95)',
                            backdropFilter: 'blur(20px)',
                            width: 250,
                        },
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 700,
                            mb: 2,
                        }}
                    >
                        Menu
                    </Typography>
                </Box>
                <List>
                    {navItems.map((item) => (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton
                                onClick={() => handleNavigation(item.path)}
                                selected={pathname === item.path}
                                sx={{
                                    '&.Mui-selected': {
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        borderLeft: '3px solid #6366f1',
                                    },
                                }}
                            >
                                <Box sx={{ mr: 2, display: 'flex', color: pathname === item.path ? '#6366f1' : 'inherit' }}>
                                    {item.icon}
                                </Box>
                                <ListItemText primary={item.label} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Drawer>
        </>
    );
}
