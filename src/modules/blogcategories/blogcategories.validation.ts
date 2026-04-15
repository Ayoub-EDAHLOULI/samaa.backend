import { z } from "zod";

export const blogCategoryValidation = {
  // POST /blog/categories
  create: z.object({
    body: z.object({
      handle: z
        .string()
        .min(2, "Handle must be at least 2 characters")
        .max(200, "Handle must not exceed 200 characters")
        .toLowerCase()
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          'Handle must be lowercase with hyphens (e.g., "news-updates")',
        ),
      isActive: z.boolean().optional().default(true),
      translations: z
        .array(
          z.object({
            languageCode: z.string().length(2, "Invalid language code"),
            title: z
              .string()
              .min(2, "Title must be at least 2 characters")
              .max(200, "Title must not exceed 200 characters"),
            description: z.string().max(1000).optional(),
          }),
        )
        .min(1, "At least one translation is required"),
    }),
  }),

  // PUT /blog/categories/:id
  update: z.object({
    body: z.object({
      handle: z
        .string()
        .min(2)
        .max(200)
        .toLowerCase()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .optional(),
      isActive: z.boolean().optional(),
    }),
  }),

  // PUT /blog/categories/:id/translations/:languageCode
  updateTranslation: z.object({
    body: z.object({
      title: z.string().min(2).max(200).optional(),
      description: z.string().max(1000).optional(),
    }),
  }),

  // Common ID param validator
  params: z.object({
    params: z.object({
      id: z.string().regex(/^\d+$/, "ID must be a number"),
    }),
  }),

  // Validator for translation endpoints
  translationParams: z.object({
    params: z.object({
      id: z.string().regex(/^\d+$/, "ID must be a number"),
      languageCode: z.string().length(2, "Invalid language code"),
    }),
  }),

  // Validator for getting by handle
  handleParams: z.object({
    params: z.object({
      handle: z.string().min(2).max(200),
    }),
  }),
};
