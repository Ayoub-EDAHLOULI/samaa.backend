// --------------------
// DTOs (Data Transfer Objects)
// --------------------

export interface BlogCategoryTranslationDto {
  languageCode: string;
  title: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface CreateBlogCategoryDto {
  handle: string;
  isActive?: boolean; // Defaults to true in Prisma
  translations: BlogCategoryTranslationDto[];
}

export interface UpdateBlogCategoryDto {
  handle?: string;
  isActive?: boolean;
  translations?: BlogCategoryTranslationDto[];
}

export interface UpdateBlogCategoryTranslationDto {
  title?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// --------------------
// RESPONSES
// --------------------

export interface BlogCategoryResponse {
  id: number;
  handle: string;
  isActive: boolean;

  // Flattened translation fields (based on the requested language)
  title: string;
  description?: string;

  createdAt: Date;
  updatedAt: Date;

  // Optional counts or extras
  postsCount?: number;
}

// --------------------
// SHARED
// --------------------

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface BlogCategoryFilterParams {
  isActive?: string; // passed as query param string "true"/"false"
  search?: string;
}
