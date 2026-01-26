/**
 * API Response Types
 * Types for all API endpoint responses
 */

// Auth API Types
export interface AuthCheckResponse {
  isAuthenticated: boolean;
  authToken?: string;
  user?: {
    id: number;
    name: string;
    location: string;
    joined_at: string;
    picture: string;
    authToken: string;
  };
}

// MAL API Types
export interface MALAnimeListResponse {
  animeList: Array<{
    id: number;
    malId: number;
    title: string;
    mainPictureMedium?: string;
    mainPictureLarge?: string;
    status: string;
    score?: number;
    numEpisodesWatched?: number;
    isRewatching: boolean;
    updatedAtMAL?: string;
    startDate?: string;
  }>;
}

// Sonarr API Types
export interface SonarrSeriesResponse {
  series: Array<{
    id: number;
    title: string;
    alternateTitles: any;
    status: string;
    overview: string;
    tvdbId: number;
    malId?: number;
    genres: Array<{ genre: string }>;
  }>;
}

export interface SonarrRootFolder {
  id: number;
  path: string;
  accessible: boolean;
  freeSpace: number;
  unmappedFolders: any[];
}

// Sync API Types
export interface SyncDiffResponse {
  success?: boolean;
  message?: string;
  data?: {
    results?: any[];
    diff?: string[];
    lists?: {
      mal: string[];
      sonarr: Array<{ id: number; titles: string[] }>;
    };
  };
  diff?: string[];
  lists?: {
    mal: string[];
    sonarr: string[] | Array<{ id: number; titles: string[] }>;
  };
}

// OAuth API Types
export interface OAuthStep1Response {
  authorizationUrl: string;
}

export interface OAuthStep2Response {
  message: string;
  success?: boolean;
}

// TVDB API Types
export interface TVDBLoginResponse {
  data: {
    token: string;
  };
  status: string;
}

export interface TVDBSearchResult {
  data: Array<{
    id: string;
    name: string;
    primary_type: string;
    primary_language: string;
    genres?: string[];
  }>;
}

// Generic API Error Response
export interface APIErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

// Utility type for API responses with error handling
export type APIResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; message?: string };
