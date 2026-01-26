/**
 * Display Anime List Component
 * Refactored to use separate AnimeCard component and cleaner organization
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Typography, Box, Pagination } from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { AnimeCard } from './AnimeCard';
import { AnimeListFilters } from './AnimeListFilters';
import { Anime, SonarrSeries } from '../../../types/interfaces';

interface AnimeListData {
  animeList: Anime[];
  sonarrList: SonarrSeries[];
  syncResults?: { title: string; success: boolean; reason?: string }[] | null;
}

const DisplayAnimeList: React.FC<AnimeListData> = ({ animeList, sonarrList }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'synced' | 'unsynced'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'malId' | 'status'>('title');
  const [currentPage, setCurrentPage] = useState(1);
  const [sonarrUrl, setSonarrUrl] = useState<string | null>(null);
  const itemsPerPage = 50;

  // Fetch Sonarr URL for link generation
  useEffect(() => {
    async function fetchSonarrConfig() {
      try {
        const response = await fetch('/api/sonarr/config');
        if (response.ok) {
          const data = await response.json();
          setSonarrUrl(data.sonarrUrl);
        }
      } catch (error) {
        console.error('Failed to fetch Sonarr config:', error);
      }
    }
    fetchSonarrConfig();
  }, []);

  // Memoize sonarrMap for efficient lookups
  const sonarrMap = useMemo(() => {
    const map = new Map<number, SonarrSeries>();
    if (Array.isArray(sonarrList)) {
      sonarrList.forEach(series => {
        if (series.malId) {
          map.set(series.malId, series);
        }
      });
    }
    return map;
  }, [sonarrList]);

  const totalAnime = animeList.length;

  // Filter and sort anime list
  const filteredAndSortedAnime = useMemo(() => {
    let filtered = [...animeList];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(anime =>
        anime.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sync status filter
    if (filterStatus === 'synced') {
      filtered = filtered.filter(anime => anime.malId && sonarrMap.has(anime.malId));
    } else if (filterStatus === 'unsynced') {
      filtered = filtered.filter(anime => !anime.malId || !sonarrMap.has(anime.malId));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'malId':
          return (a.malId || 0) - (b.malId || 0);
        case 'status':
          const aInSync = a.malId && sonarrMap.has(a.malId) ? 1 : 0;
          const bInSync = b.malId && sonarrMap.has(b.malId) ? 1 : 0;
          return bInSync - aInSync; // Synced first
        default:
          return 0;
      }
    });

    return filtered;
  }, [animeList, searchQuery, filterStatus, sortBy, sonarrMap]);

  // Paginate results
  const totalPages = Math.ceil(filteredAndSortedAnime.length / itemsPerPage);
  const paginatedAnime = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedAnime.slice(startIndex, endIndex);
  }, [filteredAndSortedAnime, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = (callback: () => void) => {
    callback();
    setCurrentPage(1);
  };

  return (
    <Grid2
      container
      spacing={3}
      sx={{
        padding: 0,
      }}
    >
      {/* Hero Header */}
      <Grid2 size={12}>
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            mb: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            My Anime Collection
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Browse and manage your synchronized anime
          </Typography>
        </Box>
      </Grid2>

      {/* Filters */}
      <Grid2 size={12}>
        <AnimeListFilters
          searchQuery={searchQuery}
          filterStatus={filterStatus}
          sortBy={sortBy}
          onSearchChange={(value) => handleFilterChange(() => setSearchQuery(value))}
          onFilterChange={(value) => handleFilterChange(() => setFilterStatus(value))}
          onSortChange={(value) => handleFilterChange(() => setSortBy(value))}
        />
      </Grid2>

      {/* Results count */}
      {(searchQuery || filterStatus !== 'all') && (
        <Grid2 size={12}>
          <Box
            sx={{
              textAlign: 'center',
              p: 1,
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: 2,
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: '#818cf8', fontWeight: 600, fontSize: '0.85rem' }}
            >
              Showing {filteredAndSortedAnime.length} of {totalAnime} anime
            </Typography>
          </Box>
        </Grid2>
      )}

      {/* Empty state */}
      {filteredAndSortedAnime.length === 0 && (
        <Grid2 size={12}>
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              background: '#000000',
              borderRadius: 3,
              border: '1px dashed rgba(99, 102, 241, 0.3)',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
            }}
          >
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 1 }} gutterBottom>
              No anime found
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {searchQuery ? (
                <>Try searching for different terms or adjust your filters</>
              ) : (
                'Try adjusting your filters to see more results'
              )}
            </Typography>
          </Box>
        </Grid2>
      )}

      {/* Anime cards */}
      {paginatedAnime.map((anime, index) => {
        const isInSync = anime.malId && sonarrMap.has(anime.malId);
        const sonarrSeries = isInSync ? sonarrMap.get(anime.malId) : undefined;

        return (
          <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={anime.malId || index}>
            <AnimeCard
              anime={anime}
              sonarrSeries={sonarrSeries}
              isInSync={!!isInSync}
              sonarrUrl={sonarrUrl}
            />
          </Grid2>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <Grid2 size={12}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 3,
            }}
          >
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
              size="large"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#fff',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                  },
                  '&.Mui-selected': {
                    bgcolor: '#6366f1',
                    color: '#fff',
                    '&:hover': {
                      bgcolor: '#5558e3',
                    },
                  },
                },
              }}
            />
          </Box>
        </Grid2>
      )}
    </Grid2>
  );
};

export default React.memo(DisplayAnimeList);
