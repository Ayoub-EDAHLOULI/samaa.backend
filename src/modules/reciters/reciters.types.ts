export interface ReciterTranslationResponse {
  language: string;
  name: string;
  nationality: string | null;
  shortBio: string | null;
  biography: string | null;
  seoTitle: string | null;
  tags: string | null;
}

// Core fields shared by all responses
interface ReciterBase {
  id: string;
  slug: string;
  imageUrl: string | null;
  countryCode: string | null;
  style: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  totalDiscoveries: number;
  favoritesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Public / list response — one language's translation attached
export interface ReciterResponse extends ReciterBase {
  translation: ReciterTranslationResponse | null;
}

// Result of a pgvector nearest-neighbor search against Reciter.embedding
export interface VoiceMatchResult {
  id: string;
  slug: string;
  imageUrl: string | null;
  name: string; // English translation name
  similarity: number; // 0.0 - 1.0 (cosine similarity, 1.0 = identical)
}

// Detail response — adds isFavorited for authenticated users
export interface ReciterDetailResponse extends ReciterResponse {
  isFavorited: boolean | null;
}

// Admin response — all translations returned (used in edit forms)
export interface AdminReciterResponse extends ReciterBase {
  translations: ReciterTranslationResponse[];
}

// DTO sent by admin when creating a reciter
export interface CreateReciterDto {
  slug: string;
  imageUrl?: string;
  countryCode?: string;
  style?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  // Translation (at least one required)
  language: string;
  name: string;
  nationality?: string;
  shortBio?: string;
  biography?: string;
  seoTitle?: string;
  tags?: string;
}

// DTO sent by admin when updating — all optional
export interface UpdateReciterDto {
  slug?: string;
  imageUrl?: string;
  countryCode?: string;
  style?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  // Which translation to upsert (defaults to "en" if not provided)
  language?: string;
  name?: string;
  nationality?: string;
  shortBio?: string;
  biography?: string;
  seoTitle?: string;
  tags?: string;
}

export interface ToggleFavoriteResult {
  isFavorited: boolean;
}
