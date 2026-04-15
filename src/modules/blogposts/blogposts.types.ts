// --------------------
// DTOs
// --------------------

export interface BlogPostTranslationDto {
  languageCode: string;
  title: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string;
}

export interface CreateBlogPostDto {
  handle: string;
  categoryId: number; // ID of the BlogCategory
  authorId: string; // ID of the User authoring the post
  isPublished?: boolean; // Defaults to false
  publishedAt?: Date | string;
  readTimeMinutes?: number;
  translations: BlogPostTranslationDto[];
}

export interface UpdateBlogPostDto {
  handle?: string;
  categoryId?: number;
  isPublished?: boolean;
  publishedAt?: Date | string;
  readTimeMinutes?: number;
  translations?: BlogPostTranslationDto[];
}

export interface UpdateBlogPostTranslationDto {
  title?: string;
  content?: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// --------------------
// FILTERS
// --------------------

export interface BlogPostFilterParams {
  page?: number;
  pageSize?: number;
  languageCode?: string;
  search?: string;
  categoryId?: number;
  authorId?: string;
  isPublished?: string; // "true", "false", or undefined (for all)
  sortBy?: "createdAt" | "publishedAt" | "title";
  sortOrder?: "asc" | "desc";
}
