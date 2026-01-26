/**
 * Individual Anime Card Component
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Divider,
  Box,
  Chip,
  Stack,
  Link,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Anime, SonarrSeries } from '../../../types/interfaces';

interface AnimeCardProps {
  anime: Anime;
  sonarrSeries?: SonarrSeries;
  isInSync: boolean;
  sonarrUrl: string | null;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  sonarrSeries,
  isInSync,
  sonarrUrl,
}) => {
  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        background: '#000000',
        border: '2px solid',
        borderColor: isInSync ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
        boxShadow: isInSync
          ? '0 0 30px rgba(34, 197, 94, 0.2)'
          : '0 0 30px rgba(239, 68, 68, 0.2)',
        minHeight: '420px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: isInSync
            ? '0 12px 40px rgba(34, 197, 94, 0.3)'
            : '0 12px 40px rgba(239, 68, 68, 0.3)',
          borderColor: isInSync ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)',
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          image={anime.mainPictureLarge?.toString() || anime.mainPictureMedium?.toString()}
          alt={anime.title}
          loading="lazy"
          sx={{
            height: 200,
            objectFit: 'cover',
            filter: isInSync ? 'brightness(1)' : 'brightness(0.7)',
          }}
        />

        {/* Status Badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: isInSync ? 'success.main' : 'error.main',
            color: 'white',
            px: 1,
            py: 0.3,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.3,
            boxShadow: 3,
          }}
        >
          {isInSync ? (
            <CheckCircleIcon sx={{ fontSize: '14px' }} />
          ) : (
            <ErrorIcon sx={{ fontSize: '14px' }} />
          )}
          <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.65rem' }}>
            {isInSync ? 'SYNCED' : 'NOT SYNCED'}
          </Typography>
        </Box>

        {/* Score Badge */}
        {anime.score && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: 'rgba(0, 0, 0, 0.8)',
              color: '#FFD700',
              px: 1,
              py: 0.3,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
            }}
          >
            <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
              ★ {anime.score}
            </Typography>
          </Box>
        )}
      </Box>

      <CardContent
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 1.5,
          '&:last-child': { pb: 1.5 },
        }}
      >
        {/* Title - Clickable if synced */}
        {isInSync && sonarrSeries && sonarrUrl ? (
          <Link
            href={`${sonarrUrl}/series/${sonarrSeries.titleSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 0.5,
              mb: 1,
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
                minHeight: '2.8em',
                fontSize: '0.95rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                flex: 1,
              }}
            >
              {anime.title}
            </Typography>
            <OpenInNewIcon sx={{ fontSize: '16px', mt: 0.2, flexShrink: 0 }} />
          </Link>
        ) : (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              marginBottom: 1,
              lineHeight: 1.2,
              minHeight: '2.8em',
              fontSize: '0.95rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {anime.title}
          </Typography>
        )}

        <Stack spacing={0.5} sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ minWidth: '70px', fontSize: '0.7rem' }}
            >
              Status:
            </Typography>
            <Chip
              label={anime.status}
              size="small"
              color={anime.status === 'watching' ? 'primary' : 'default'}
              sx={{ fontSize: '0.65rem', height: '18px' }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ minWidth: '70px', fontSize: '0.7rem' }}
            >
              MAL ID:
            </Typography>
            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
              #{anime.malId}
            </Typography>
          </Box>

          {anime.numEpisodesWatched !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ minWidth: '70px', fontSize: '0.7rem' }}
              >
                Episodes:
              </Typography>
              <Typography
                variant="body2"
                fontWeight="bold"
                color="primary.main"
                sx={{ fontSize: '0.75rem' }}
              >
                {anime.numEpisodesWatched} watched
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Genres from Sonarr */}
        {isInSync &&
          sonarrSeries &&
          sonarrSeries.genres &&
          sonarrSeries.genres.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                {sonarrSeries.genres.slice(0, 3).map((genreObj, i) => (
                  <Chip
                    key={i}
                    label={genreObj.genre}
                    size="small"
                    sx={{
                      fontSize: '0.6rem',
                      height: '18px',
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      color: 'white',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

        <Divider sx={{ my: 1 }} />

        {/* Sync Status Details */}
        <Box sx={{ mt: 'auto' }}>
          {isInSync && sonarrSeries ? (
            <Box>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ fontSize: '0.65rem' }}
              >
                Sonarr:
              </Typography>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 500, fontSize: '0.75rem' }}
              >
                {sonarrSeries.title}
              </Typography>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ fontSize: '0.65rem' }}
              >
                Series ID: {sonarrSeries.id}
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography
                variant="caption"
                color="error.main"
                sx={{ fontSize: '0.65rem', fontWeight: 600 }}
              >
                Not synced to Sonarr
              </Typography>
              <Typography
                variant="caption"
                color="textSecondary"
                display="block"
                sx={{ fontSize: '0.65rem', mt: 0.5 }}
              >
                Click "Sync" to add to Sonarr
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
