import { Typography, Box } from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { keyframes } from '@mui/system';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const glow = keyframes`
  0%, 100% {
    opacity: 0.5;
    filter: blur(20px);
  }
  50% {
    opacity: 0.8;
    filter: blur(25px);
  }
`;

const Hero = () => {
  return (
    <Grid2
      container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: { xs: 3, sm: 4, md: 6 },
        marginTop: { xs: 4, md: 8 },
        position: 'relative',
      }}
    >
      <Grid2 size={12} sx={{ position: 'relative' }}>
        {/* Glowing effect behind text */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            height: '80%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
            filter: 'blur(40px)',
            animation: `${glow} 4s ease-in-out infinite`,
            pointerEvents: 'none',
          }}
        />
        <Typography
          variant="h1"
          sx={{
            position: 'relative',
            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '5.5rem', lg: '6.5rem' },
            fontWeight: 800,
            marginBottom: 3,
            background: 'linear-gradient(135deg, #ffffff 0%, #6366f1 50%, #ec4899 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: `${fadeIn} 0.8s ease-out`,
            letterSpacing: '-0.03em',
            textShadow: '0 0 80px rgba(99, 102, 241, 0.5)',
          }}
        >
          Mal2Sonarr
        </Typography>
      </Grid2>
      <Grid2 size={12} sx={{ maxWidth: '800px' }}>
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '1.1rem', sm: '1.4rem', md: '1.6rem' },
            fontWeight: 400,
            marginTop: 0,
            marginBottom: 3,
            lineHeight: 1.6,
            color: 'rgba(255, 255, 255, 0.6)',
            animation: `${fadeIn} 0.8s ease-out 0.2s both`,
          }}
        >
          Automatically sync your MyAnimeList watching list with Sonarr
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 3,
            marginTop: 4,
            animation: `${fadeIn} 0.8s ease-out 0.4s both`,
          }}
        >
          <Box
            sx={{
              width: '60px',
              height: '4px',
              background: 'linear-gradient(90deg, transparent, #6366f1, #ec4899, transparent)',
              borderRadius: '2px',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent, #6366f1, #ec4899, transparent)',
                filter: 'blur(8px)',
                opacity: 0.6,
              },
            }}
          />
        </Box>
      </Grid2>
    </Grid2>
  );
};

export default Hero;
