export interface CreateReciterDto {
  name: string;
  slug: string;
  biography?: string;
  imageUrl?: string;
  nationality?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
}

export interface UpdateReciterDto {
  name?: string;
  slug?: string;
  biography?: string;
  imageUrl?: string;
  nationality?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
}

export interface ReciterResponse {
  id: string;
  name: string;
  slug: string;
  biography: string | null;
  imageUrl: string | null;
  nationality: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  totalDiscoveries: number;
  favoritesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReciterDetailResponse extends ReciterResponse {
  // Whether the currently authenticated user has favorited this reciter.
  // null when the request is anonymous.
  isFavorited: boolean | null;
}

export interface ToggleFavoriteResult {
  isFavorited: boolean;
}
