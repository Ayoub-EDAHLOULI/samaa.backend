export interface ProcessAudioOptions {
  userId?: string;
  audioDuration?: number; // seconds, passed from the client via form-data
  deviceOs?: string; // "iOS" | "Android" | "Web", passed from the client
}

export interface RecognitionResultResponse {
  isMatch: boolean;
  confidence: number;
  message: string;
  // Populated only on a successful match
  recognitionId?: string;
  reciter?: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  };
}

export interface RecognitionHistoryItem {
  id: string;
  confidenceScore: number;
  audioDuration: number | null;
  deviceOs: string | null;
  ayahNumber: number | null;
  createdAt: Date;
  reciter: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  };
  surah: {
    id: number;
    arabicName: string;
    englishName: string;
  } | null;
}

// Admin view — includes user info
export interface AdminRecognitionItem extends RecognitionHistoryItem {
  user: {
    id: string;
    displayName: string;
    email: string;
  } | null;
}
