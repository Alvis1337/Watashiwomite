'use client';

// Redesigned: Status dashboard with user card, stats, and OAuth tools

import { useState } from 'react';
import {
  Button,
  TextField,
  Card,
  CardContent,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { keyframes } from '@mui/system';
import LoginIcon from '@mui/icons-material/Login';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PersonIcon from '@mui/icons-material/Person';
import LinkIcon from '@mui/icons-material/Link';
import SecurityIcon from '@mui/icons-material/Security';

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const OauthInit = () => {
  const [username, setUsername] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuthorize = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/oauth/step1?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.authorizationUrl) {
        setLink(data.authorizationUrl);
      } else {
        console.error('Authorization URL not found');
      }
    } catch (error) {
      console.error('Failed to fetch authorization URL', error);
    } finally {
      setLoading(false);
    }
  };

  const activeStep = link ? 1 : 0;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: { xs: 2, sm: 3 },
        animation: `${slideIn} 0.6s ease-out 0.3s both`,
      }}
    >
      {/* Main Grid Container */}
      <Grid2 container spacing={3}>
        {/* Left Side - User Status Card */}
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              background: '#000000',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 4,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 60px rgba(99, 102, 241, 0.15)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #6366f1, #ec4899, transparent)',
              },
            }}
          >
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <PersonIcon sx={{ fontSize: 56, color: '#818cf8', mb: 1.5, filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.5))' }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                  Connection Status
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 0.5, fontSize: '0.9rem' }}>
                  MyAnimeList Integration
                </Typography>
              </Box>

              <Divider sx={{ borderColor: 'rgba(99, 102, 241, 0.2)' }} />

              {/* Stats Section */}
              <Stack spacing={2.5} sx={{ flex: 1 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 1.5, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}
                  >
                    Connection Status
                  </Typography>
                  <Chip
                    icon={username ? <CheckCircleOutlineIcon /> : <SecurityIcon />}
                    label={username ? 'Username Set' : 'Not Connected'}
                    sx={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      py: 2.5,
                      bgcolor: username ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: username ? '#4ade80' : '#fbbf24',
                      fontWeight: 700,
                      border: username
                        ? '1px solid rgba(34, 197, 94, 0.3)'
                        : '1px solid rgba(245, 158, 11, 0.3)',
                      '& .MuiChip-icon': {
                        color: 'inherit',
                      },
                    }}
                  />
                </Box>

                {username && (
                  <Box sx={{ animation: `${fadeIn} 0.5s ease-out` }}>
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 1.5, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}
                    >
                      Username
                    </Typography>
                    <Box
                      sx={{
                        p: 2.5,
                        background: '#000000',
                        borderRadius: 3,
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{ color: '#fff', fontWeight: 700, wordBreak: 'break-word', fontSize: '1.1rem' }}
                      >
                        {username}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 1.5, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}
                  >
                    Authorization
                  </Typography>
                  <Chip
                    icon={<LinkIcon />}
                    label={link ? 'Link Generated' : 'Pending'}
                    sx={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      py: 2.5,
                      bgcolor: link ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: link ? '#818cf8' : 'rgba(255, 255, 255, 0.4)',
                      fontWeight: 700,
                      border: link
                        ? '1px solid rgba(99, 102, 241, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      '& .MuiChip-icon': {
                        color: 'inherit',
                      },
                    }}
                  />
                </Box>
              </Stack>

              {/* Progress Indicator */}
              <Box
                sx={{
                  mt: 'auto',
                  p: 2.5,
                  background: '#000000',
                  borderRadius: 3,
                  textAlign: 'center',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
                }}
              >
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, fontSize: '0.85rem' }}>
                  Progress: Step {activeStep + 1} of 2
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid2>

        {/* Right Side - OAuth Setup Card */}
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Card
            sx={{
              background: '#000000',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 4,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 60px rgba(99, 102, 241, 0.15)',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #6366f1, #ec4899, transparent)',
              },
            }}
          >
            <CardContent sx={{ padding: { xs: 3, sm: 3, md: 4 } }}>
              <Box sx={{ marginBottom: 3 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    marginBottom: 1,
                    color: '#fff',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Get Started
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                  }}
                >
                  Connect your MyAnimeList account to start syncing your anime collection with
                  Sonarr
                </Typography>
              </Box>

              <Stepper
                activeStep={activeStep}
                sx={{
                  marginBottom: 4,
                  '& .MuiStepLabel-root .Mui-completed': {
                    color: '#4ade80',
                  },
                  '& .MuiStepLabel-label.Mui-completed': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    fontWeight: 600,
                  },
                  '& .MuiStepLabel-root .Mui-active': {
                    color: '#818cf8',
                  },
                  '& .MuiStepLabel-label.Mui-active': {
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    fontWeight: 600,
                  },
                  '& .MuiStepLabel-label': {
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  },
                  '& .MuiStepConnector-line': {
                    borderColor: 'rgba(99, 102, 241, 0.2)',
                  },
                }}
              >
                <Step>
                  <StepLabel>Enter Username</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Authorize</StepLabel>
                </Step>
              </Stepper>

              <Box sx={{ marginTop: 3 }}>
                <TextField
                  label="MyAnimeList Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && username && !loading) {
                      handleAuthorize();
                    }
                  }}
                  fullWidth
                  disabled={!!link}
                  placeholder="Enter your MAL username"
                  sx={{
                    marginBottom: 3,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#000000',
                      borderRadius: 3,
                      '& fieldset': {
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(99, 102, 241, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#6366f1',
                        borderWidth: 2,
                      },
                      '&.Mui-disabled': {
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontWeight: 600,
                      '&.Mui-focused': {
                        color: '#818cf8',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: '#fff',
                      fontWeight: 500,
                    },
                  }}
                  InputProps={{
                    endAdornment: link ? (
                      <CheckCircleOutlineIcon sx={{ color: '#4ade80' }} />
                    ) : null,
                  }}
                />

                {!link ? (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleAuthorize}
                    disabled={!username || loading}
                    fullWidth
                    startIcon={<LoginIcon />}
                    sx={{
                      padding: '14px 28px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      borderRadius: 3,
                      background: username
                        ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                        : undefined,
                      boxShadow: username ? '0 8px 24px rgba(99, 102, 241, 0.4)' : undefined,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                        transition: 'left 0.5s',
                      },
                      '&:hover': {
                        background: username ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' : undefined,
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 32px rgba(99, 102, 241, 0.5)',
                        '&::before': {
                          left: '100%',
                        },
                      },
                      '&:disabled': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'rgba(255, 255, 255, 0.3)',
                      },
                    }}
                  >
                    {loading ? 'Generating Link...' : 'Generate Authorization Link'}
                  </Button>
                ) : (
                  <Box
                    sx={{
                      animation: `${slideIn} 0.5s ease-out`,
                    }}
                  >
                    <Box
                      sx={{
                        padding: 2.5,
                        marginBottom: 3,
                        background: '#000000',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        borderRadius: 3,
                        boxShadow: '0 0 30px rgba(34, 197, 94, 0.2)',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#4ade80',
                          fontWeight: 700,
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                        }}
                      >
                        <CheckCircleOutlineIcon sx={{ fontSize: '1.2rem' }} />
                        Authorization link generated successfully
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="large"
                      component="a"
                      href={link}
                      fullWidth
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        padding: '14px 28px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
                        transition: 'all 0.3s ease',
                        animation: `${pulse} 2s ease-in-out infinite`,
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: '-100%',
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                          transition: 'left 0.5s',
                        },
                        '&:hover': {
                          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 12px 32px rgba(34, 197, 94, 0.5)',
                          animation: 'none',
                          '&::before': {
                            left: '100%',
                          },
                        },
                      }}
                    >
                      Continue to MyAnimeList
                    </Button>
                  </Box>
                )}
              </Box>

              <Box sx={{ marginTop: 3, textAlign: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.85rem',
                  }}
                >
                  You&apos;ll be redirected to MyAnimeList to authorize this application
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Box>
  );
};

export default OauthInit;
