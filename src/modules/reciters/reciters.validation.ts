import { z } from "zod";

const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(150, "Slug must not exceed 150 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must contain only lowercase letters, digits, and hyphens",
  )
  .transform((v) => v.trim());

export const reciterValidation = {
  // Admin: create a reciter
  create: z.object({
    body: z.object({
      slug: slugSchema,
      language: z
        .string()
        .min(2)
        .max(3)
        .regex(/^[a-z]{2,3}$/, "Invalid language code")
        .default("en"),
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(200, "Name must not exceed 200 characters")
        .transform((v) => v.trim()),
      countryCode: z
        .string()
        .length(2, "Country code must be exactly 2 characters (ISO 3166-1)")
        .transform((v) => v.toUpperCase())
        .optional(),
      style: z
        .string()
        .max(50)
        .transform((v) => v.trim())
        .optional(),
      nationality: z
        .string()
        .max(100)
        .transform((v) => v.trim())
        .optional(),
      shortBio: z.string().max(500).optional(),
      biography: z.string().max(10000).optional(),
      seoTitle: z
        .string()
        .max(200)
        .transform((v) => v.trim())
        .optional(),
      tags: z.string().max(500).optional(),
      spotifyUrl: z.url({ error: "Invalid Spotify URL" }).optional(),
      youtubeUrl: z.url({ error: "Invalid YouTube URL" }).optional(),
    }),
  }),

  // Admin: update a reciter (all fields optional)
  update: z.object({
    body: z.object({
      slug: slugSchema.optional(),
      language: z
        .string()
        .min(2)
        .max(3)
        .regex(/^[a-z]{2,3}$/, "Invalid language code")
        .optional(),
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(200)
        .transform((v) => v.trim())
        .optional(),
      countryCode: z
        .string()
        .length(2, "Country code must be exactly 2 characters")
        .transform((v) => v.toUpperCase())
        .optional(),
      style: z
        .string()
        .max(50)
        .transform((v) => v.trim())
        .optional(),
      nationality: z
        .string()
        .max(100)
        .transform((v) => v.trim())
        .optional(),
      shortBio: z.string().max(500).optional(),
      biography: z.string().max(10000).optional(),
      seoTitle: z
        .string()
        .max(200)
        .transform((v) => v.trim())
        .optional(),
      tags: z.string().max(500).optional(),
      spotifyUrl: z.url({ error: "Invalid Spotify URL" }).optional(),
      youtubeUrl: z.url({ error: "Invalid YouTube URL" }).optional(),
    }),
  }),

  // UUID param — used for write operations (/reciters/:id)
  idParam: z.object({
    params: z.object({
      id: z.uuid({ error: "Invalid reciter ID — must be a UUID" }),
    }),
  }),

  // Pagination + search + language query
  listQuery: z.object({
    query: z.object({
      page: z
        .string()
        .optional()
        .transform((v) => (v ? Math.max(1, parseInt(v)) : 1)),
      limit: z
        .string()
        .optional()
        .transform((v) => (v ? Math.min(100, Math.max(1, parseInt(v))) : 20)),
      search: z.string().optional(),
      lang: z.string().min(2).max(3).optional(),
    }),
  }),
};
