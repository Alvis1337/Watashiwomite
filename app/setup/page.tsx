'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const steps = ['MAL Configuration', 'Sonarr Configuration', 'TVDB Configuration'];

export default function SetupPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState({
    malClientId: '',
    malClientSecret: '',
    malRedirectUri: 'http://localhost:3000/api/oauth/step2',
    sonarrUrl: 'http://localhost:8989',
    sonarrApiKey: '',
    tvdbApiKey: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [field]: event.target.value });
    setErrors({ ...errors, [field]: '' });
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (activeStep === 0) {
      if (!settings.malClientId) newErrors.malClientId = 'MAL Client ID is required';
      if (!settings.malClientSecret) newErrors.malClientSecret = 'MAL Client Secret is required';
      if (!settings.malRedirectUri) newErrors.malRedirectUri = 'MAL Redirect URI is required';
    } else if (activeStep === 1) {
      if (!settings.sonarrUrl) newErrors.sonarrUrl = 'Sonarr URL is required';
      if (!settings.sonarrApiKey) newErrors.sonarrApiKey = 'Sonarr API Key is required';
    } else if (activeStep === 2) {
      if (!settings.tvdbApiKey) newErrors.tvdbApiKey = 'TVDB API Key is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (activeStep === steps.length - 1) {
        handleSubmit();
      } else {
        setActiveStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Settings saved successfully!');
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 600,
          width: '100%',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
              textAlign: 'center',
            }}
          >
            Welcome to Watashiwomite
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 4, textAlign: 'center' }}
          >
            Let's configure your application settings
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Get your MAL credentials from{' '}
                <a
                  href="https://myanimelist.net/apiconfig"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#6366f1' }}
                >
                  MyAnimeList API Settings
                </a>
              </Alert>
              <TextField
                label="MAL Client ID"
                value={settings.malClientId}
                onChange={handleChange('malClientId')}
                error={!!errors.malClientId}
                helperText={errors.malClientId}
                fullWidth
              />
              <TextField
                label="MAL Client Secret"
                value={settings.malClientSecret}
                onChange={handleChange('malClientSecret')}
                error={!!errors.malClientSecret}
                helperText={errors.malClientSecret}
                type="password"
                fullWidth
              />
              <TextField
                label="MAL Redirect URI"
                value={settings.malRedirectUri}
                onChange={handleChange('malRedirectUri')}
                error={!!errors.malRedirectUri}
                helperText={errors.malRedirectUri}
                fullWidth
              />
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Find your Sonarr API key in Settings → General → Security
              </Alert>
              <TextField
                label="Sonarr URL"
                value={settings.sonarrUrl}
                onChange={handleChange('sonarrUrl')}
                error={!!errors.sonarrUrl}
                helperText={errors.sonarrUrl}
                placeholder="http://localhost:8989"
                fullWidth
              />
              <TextField
                label="Sonarr API Key"
                value={settings.sonarrApiKey}
                onChange={handleChange('sonarrApiKey')}
                error={!!errors.sonarrApiKey}
                helperText={errors.sonarrApiKey}
                type="password"
                fullWidth
              />
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Get your TVDB API key from{' '}
                <a
                  href="https://thetvdb.com/dashboard/account/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#6366f1' }}
                >
                  TVDB Dashboard
                </a>
              </Alert>
              <TextField
                label="TVDB API Key"
                value={settings.tvdbApiKey}
                onChange={handleChange('tvdbApiKey')}
                error={!!errors.tvdbApiKey}
                helperText={errors.tvdbApiKey}
                type="password"
                fullWidth
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button disabled={activeStep === 0} onClick={handleBack} sx={{ textTransform: 'none' }}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                textTransform: 'none',
                minWidth: 100,
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : activeStep === steps.length - 1 ? (
                'Complete Setup'
              ) : (
                'Next'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
