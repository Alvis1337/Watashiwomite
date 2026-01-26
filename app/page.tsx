'use client';

import { CircularProgress, Box } from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { useState, useEffect } from 'react';
import Hero from './components/index/Hero';
import OauthInit from './components/index/OauthInit';
import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  // Prevent hydration mismatch by not rendering auth-dependent content until mounted
  if (!mounted || isLoading) {
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
        <Box sx={{ position: 'relative' }}>
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
      </Box>
    );
  }

  // If authenticated, don't show landing page (will redirect)
  if (isAuthenticated) {
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

  return (
    <Grid2
      container
      sx={{
        minHeight: '100vh',
        background: '#000000',
        width: '100%',
        margin: 0,
        padding: 0,
      }}
    >
      <Grid2 size={12} sx={{ position: 'relative', zIndex: 1, px: 4, py: 4 }}>
        <Hero />
      </Grid2>
      <Grid2 size={12} sx={{ position: 'relative', zIndex: 1, px: 4, py: 4 }}>
        <OauthInit />
      </Grid2>
    </Grid2>
  );
}
