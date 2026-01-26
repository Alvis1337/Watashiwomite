/**
 * External API Types
 * Types for MyAnimeList, TVDB, and Sonarr APIs
 */

// MyAnimeList API Types
export interface MALUser {
  id: number;
  name: string;
  location?: string;
  joined_at: string;
  picture?: string;
}

export interface MALAnimeNode {
  id: number;
  title: string;
  main_picture: {
    medium: string;
    large: string;
  };
}

export interface MALListStatus {
  status: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';
  score: number;
  num_episodes_watched: number;
  is_rewatching: boolean;
  updated_at: string;
  start_date?: string;
  finish_date?: string;
}

export interface MALAnimeListItem {
  node: MALAnimeNode;
  list_status: MALListStatus;
}

export interface MALAnimeListResponse {
  data: MALAnimeListItem[];
  paging: {
    next?: string;
    previous?: string;
  };
}

export interface MALTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

// TVDB API Types
export interface TVDBToken {
  token: string;
}

export interface TVDBLoginResponse {
  data: {
    token: string;
  };
  status: string;
}

export interface TVDBSearchEntry {
  id: string;
  name: string;
  primary_type: 'movie' | 'series' | 'person' | 'company';
  primary_language: string;
  genres?: string[];
  year?: string;
  status?: string;
  image_url?: string;
}

export interface TVDBSearchResult {
  data: TVDBSearchEntry[];
}

export interface TVDBSeriesData {
  id: number;
  name: string;
  slug: string;
  image: string;
  nameTranslations: string[];
  overviewTranslations: string[];
  aliases: string[];
  firstAired: string;
  lastAired: string;
  status: {
    id: number;
    name: string;
  };
  originalCountry: string;
  originalLanguage: string;
  genres: Array<{ id: number; name: string }>;
}

// Sonarr API Types
export interface SonarrSeries {
  id: number;
  title: string;
  alternateTitles: Array<{
    title: string;
    seasonNumber?: number;
  }>;
  sortTitle: string;
  status: 'continuing' | 'ended' | 'upcoming' | 'deleted';
  overview: string;
  previousAiring?: string;
  network: string;
  airTime?: string;
  images: Array<{
    coverType: 'banner' | 'poster' | 'fanart';
    url: string;
    remoteUrl: string;
  }>;
  originalLanguage: {
    id: number;
    name: string;
  };
  seasons: Array<{
    seasonNumber: number;
    monitored: boolean;
    statistics: {
      episodeFileCount: number;
      episodeCount: number;
      totalEpisodeCount: number;
      sizeOnDisk: number;
      percentOfEpisodes: number;
    };
  }>;
  year: number;
  path: string;
  qualityProfileId: number;
  seasonFolder: boolean;
  monitored: boolean;
  monitorNewItems: string;
  useSceneNumbering: boolean;
  runtime: number;
  tvdbId: number;
  tvRageId: number;
  tvMazeId: number;
  tmdbId: number;
  firstAired: string;
  lastAired: string;
  seriesType: 'anime' | 'daily' | 'standard';
  cleanTitle: string;
  imdbId: string;
  titleSlug: string;
  rootFolderPath: string;
  certification?: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings: {
    votes: number;
    value: number;
  };
  statistics: {
    seasonCount: number;
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  };
  languageProfileId: number;
}

export interface SonarrAddSeriesRequest {
  tvdbId: number | string;
  title: string;
  qualityProfileId: number;
  seriesType: 'anime' | 'daily' | 'standard';
  seasonFolder: boolean;
  monitored: boolean;
  rootFolderPath: string;
  addOptions: {
    searchForMissingEpisodes: boolean;
    searchForCutoffUnmetEpisodes?: boolean;
  };
  tags?: number[];
}

export interface SonarrAddSeriesResponse extends SonarrSeries {}

export interface SonarrRootFolder {
  id: number;
  path: string;
  accessible: boolean;
  freeSpace: number;
  unmappedFolders: Array<{
    path: string;
    relativePath: string;
  }>;
}

export interface SonarrQualityProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: Array<{
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
    };
    allowed: boolean;
  }>;
}

// Common Types
export interface AnimeSeries {
  title: string;
  tvdbId: string;
}

export interface TitleMapping {
  malTitle: string;
  tvdbTitle?: string;
  tvdbId?: string;
  sonarrTitle?: string;
  confidence: 'high' | 'medium' | 'low';
}
