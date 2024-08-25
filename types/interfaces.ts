export interface Anime {
    id: number;
    title: string;
    malId: number;
    mainPictureMedium: string | null;
    mainPictureLarge: string | null;
    status: string;
    score: number | null;
    numEpisodesWatched: number | null;
    isRewatching: boolean;
    updatedAtMAL: Date | null;
    startDate: Date | null;
    tvdbId: number | null;
  }
  
  export interface UserAnimeList {
    animeList: Anime[];
  }

  export interface UserSonarrList {
    sonarrList: SonarrSeries[];
  }
  
  export interface SonarrSeries {
    id: number;
    title: string;
    alternateTitles: Record<string, any>;
    sortTitle: string;
    status: string;
    overview: string;
    previousAiring?: Date;
    network: string;
    airTime?: string;
    images: Record<string, any>;
    originalLanguage: string;
    seasons: Record<string, any>;
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
    firstAired: Date;
    lastAired: Date;
    seriesType: string;
    cleanTitle: string;
    imdbId: string;
    titleSlug: string;
    rootFolderPath: string;
    certification?: string;
    added: Date;
    ratings: Record<string, any>;
    statistics: Record<string, any>;
    languageProfileId: number;
    animeListId: number;
    animeList: AnimeList; 
    genres: SonarrSeriesGenre[]; 
    malId: number;
  }
  
  export interface SonarrSeriesGenre {
    id: number;
    genre: string;
    sonarrSeriesId: number;
    sonarrSeries: SonarrSeries;
  }
  
  export interface AnimeList {
    id: number;
    username: string;
    anime: Anime[];          
    sonarrSeries: SonarrSeries[]; 
    createdAt: Date;
    updatedAt: Date;
  }
  