/**
 * Filter and Search Controls for Anime List
 */

import React from 'react';
import {
  TextField,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

interface AnimeListFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: 'all' | 'synced' | 'unsynced';
  onFilterChange: (status: 'all' | 'synced' | 'unsynced') => void;
  sortBy: 'title' | 'malId' | 'status';
  onSortChange: (sort: 'title' | 'malId' | 'status') => void;
}

export const AnimeListFilters: React.FC<AnimeListFiltersProps> = ({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  sortBy,
  onSortChange,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        justifyContent: 'center',
        p: 2,
        background: '#000000',
        borderRadius: 3,
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
      }}
    >
      <TextField
        label="Search anime..."
        variant="outlined"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        size="small"
        placeholder="Search by title..."
        sx={{
          minWidth: 250,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#000000',
            color: '#fff',
            borderRadius: 2,
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
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: 600,
            '&.Mui-focused': {
              color: '#818cf8',
            },
          },
        }}
      />
      <FormControl
        size="small"
        sx={{
          minWidth: 130,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#000000',
            color: '#fff',
            borderRadius: 2,
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
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: 600,
            '&.Mui-focused': {
              color: '#818cf8',
            },
          },
          '& .MuiSelect-icon': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      >
        <InputLabel sx={{ fontWeight: 600 }}>Filter Status</InputLabel>
        <Select
          value={filterStatus}
          label="Filter Status"
          onChange={(e) => onFilterChange(e.target.value as 'all' | 'synced' | 'unsynced')}
        >
          <MenuItem value="all">All Anime</MenuItem>
          <MenuItem value="synced">Synced Only</MenuItem>
          <MenuItem value="unsynced">Not Synced</MenuItem>
        </Select>
      </FormControl>
      <FormControl
        size="small"
        sx={{
          minWidth: 130,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#000000',
            color: '#fff',
            borderRadius: 2,
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
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: 600,
            '&.Mui-focused': {
              color: '#818cf8',
            },
          },
          '& .MuiSelect-icon': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      >
        <InputLabel sx={{ fontWeight: 600 }}>Sort By</InputLabel>
        <Select
          value={sortBy}
          label="Sort By"
          onChange={(e) => onSortChange(e.target.value as 'title' | 'malId' | 'status')}
        >
          <MenuItem value="title">Title (A-Z)</MenuItem>
          <MenuItem value="malId">MAL ID</MenuItem>
          <MenuItem value="status">Sync Status</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};
