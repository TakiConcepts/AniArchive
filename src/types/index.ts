export interface AniListMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
  };
  format: string | null;
  status: string | null;
  coverImage: {
    large: string;
  };
  averageScore: number | null;
  idMal: number | null;
  type: "ANIME" | "MANGA";
}

export interface AniListEntry {
  mediaId: number;
  status: string;
  score: number;
  media: AniListMedia;
}

export interface AniListMediaList {
  name: string;
  entries: AniListEntry[];
}

export interface SonarrSeries {
  id?: number;
  title: string;
  tvdbId: number;
  qualityProfileId: number;
  rootFolderPath: string;
  monitored: boolean;
  addOptions?: {
    searchForMissingEpisodes: boolean;
  };
}

export interface RadarrMovie {
  id?: number;
  title: string;
  tmdbId: number;
  qualityProfileId: number;
  rootFolderPath: string;
  monitored: boolean;
  addOptions?: {
    searchForMovie: boolean;
  };
}

export interface QualityProfile {
  id: number;
  name: string;
}

export interface RootFolder {
  id: number;
  path: string;
  freeSpace: number;
}

export interface DealResult {
  title: string;
  price: number;
  currency: string;
  source: string;
  url: string;
  condition: "NEW" | "USED" | "LIKE_NEW";
}

export interface SyncResult {
  total: number;
  added: number;
  skipped: number;
  failed: number;
  errors: string[];
}
