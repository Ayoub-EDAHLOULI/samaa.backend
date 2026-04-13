export interface LanguageResponse {
  id: number;
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLanguageDto {
  code: string;
  name: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateLanguageDto {
  name?: string;
  isDefault?: boolean;
  isActive?: boolean;
}
