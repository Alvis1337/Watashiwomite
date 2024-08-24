"use client"

import { Grid } from '@mui/material'
import Hero from "./components/index/Hero";
import OauthInit from './components/index/OauthInit';
import Dashboard from './components/Dashboard';
import { useAuth } from './context/AuthContext';
import {useEffect } from 'react';

export default function Home() {
  const { setAccessToken } = useAuth();

  useEffect(() => {
      async function checkAuth() {
          const response = await fetch('/api/auth/check');
          const data = await response.json();
          if (data.isAuthenticated) {
              setAccessToken(data.authToken)
          } else {
            setAccessToken(null)
          }
      }

      checkAuth();
  }, [setAccessToken]);

  const { isAuthenticated } = useAuth()
  return (
    <Grid container sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignContent: 'center'
    }} spacing={4}>
      {!isAuthenticated ? (
        <>
          <Grid item xs={12}>
            <Hero />
          </Grid>
          <Grid item xs={12}>
            <OauthInit />
          </Grid>
        </>
      ) : (
        <Grid item xs={12}>
          <Dashboard />
        </Grid>
      )}
    </Grid>
  );
}
