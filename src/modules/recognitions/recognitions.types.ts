export interface RecognitionResultResponse {
  isMatch: boolean;
  confidence: number;
  message: string;
  reciter?: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  };
}

export interface RecognitionHistoryResponse {
  id: string;
  confidenceScore: number;
  audioDuration: number | null;
  createdAt: Date;
  reciter: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  };
}
