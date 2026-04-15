import { z } from "zod";

// Define the translation schema
const translationSchema = z.object({
  languageCode: z.string().min(2).max(10),
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(1000).optional(),
  metaTitle: z.string().max(100).optional(),
  metaDescription: z.string().max(500).optional(),
  tags: z.string().max(500).optional(),
});

export const blogPostValidation = {
  // POST /blog/posts
  create: z.object({
    body: z.object({
      handle: z
        .string()
        .min(2, "Handle must be at least 2 characters")
        .max(200, "Handle must be less than 200 characters")
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          'Handle must be lowercase with hyphens (e.g., "my-first-article")',
        ),

      // Properly validate and transform categoryId
      categoryId: z
        .string()
        .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
          message: "Category ID must be a valid positive number",
        })
        .transform((val) => Number(val)),

      isPublished: z
        .string()
        .optional()
        .transform((val) => val === "true"),

      readTimeMinutes: z
        .string()
        .optional()
        .transform((val) => (val ? Number(val) : undefined)),

      publishedAt: z.string().optional(),

      // Parse and validate translations
      translations: z.string().transform((str, ctx) => {
        try {
          const parsed = JSON.parse(str);

          // Validate it's an array
          if (!Array.isArray(parsed)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Translations must be an array",
            });
            return z.NEVER;
          }

          // Ensure at least one translation
          if (parsed.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "At least one translation is required",
            });
            return z.NEVER;
          }

          // Validate each translation object
          const validatedTranslations = [];
          const errors = [];

          for (let i = 0; i < parsed.length; i++) {
            const item = parsed[i];
            const result = translationSchema.safeParse(item);

            if (!result.success) {
              const langCode = item.languageCode || `index-${i}`;
              errors.push(
                `Translation ${langCode}: ${result.error.issues[0].message}`,
              );
            } else {
              validatedTranslations.push(result.data);
            }
          }

          // If there were validation errors, report them
          if (errors.length > 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: errors.join(", "),
            });
            return z.NEVER;
          }

          return validatedTranslations;
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid translations format - must be valid JSON array",
          });
          return z.NEVER;
        }
      }),
    }),
  }),

  // PUT /blog/posts/:id
  update: z.object({
    body: z.object({
      handle: z
        .string()
        .min(2)
        .max(200)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .optional(),

      categoryId: z
        .string()
        .optional()
        .refine(
          (val) =>
            val === undefined || (!isNaN(Number(val)) && Number(val) > 0),
          {
            message: "Category ID must be a valid positive number",
          },
        )
        .transform((val) => (val ? Number(val) : undefined)),

      isPublished: z
        .string()
        .optional()
        .transform((val) => (val === undefined ? undefined : val === "true")),

      publishedAt: z.string().optional(),

      readTimeMinutes: z
        .string()
        .optional()
        .transform((val) => (val ? Number(val) : undefined)),

      translations: z
        .string()
        .optional()
        .transform((str, ctx) => {
          if (!str) return undefined;

          try {
            const parsed = JSON.parse(str);

            if (!Array.isArray(parsed)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Translations must be an array",
              });
              return z.NEVER;
            }

            const validatedTranslations = [];
            const errors = [];

            for (let i = 0; i < parsed.length; i++) {
              const item = parsed[i];
              const result = translationSchema.safeParse(item);

              if (!result.success) {
                const langCode = item.languageCode || `index-${i}`;
                errors.push(
                  `Translation ${langCode}: ${result.error.issues[0].message}`,
                );
              } else {
                validatedTranslations.push(result.data);
              }
            }

            if (errors.length > 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: errors.join(", "),
              });
              return z.NEVER;
            }

            return validatedTranslations;
          } catch (e) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Invalid translations JSON format",
            });
            return z.NEVER;
          }
        }),
    }),
  }),

  params: z.object({
    params: z.object({
      id: z.string().regex(/^\d+$/, "ID must be a number"),
    }),
  }),

  handleParams: z.object({
    params: z.object({
      handle: z.string().min(2),
    }),
  }),
};
