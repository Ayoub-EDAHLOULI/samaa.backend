export interface SurahResponse {
  id: number;
  arabicName: string;
  englishName: string;
  ayahCount: number;
}

// Only these fields can be corrected by an admin
export interface UpdateSurahDto {
  arabicName?: string;
  englishName?: string;
  ayahCount?: number;
}
