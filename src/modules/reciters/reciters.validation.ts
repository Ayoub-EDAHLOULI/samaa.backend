import { z } from "zod";

// Slug: lowercase letters, digits, hyphens — no spaces
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
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(200, "Name must not exceed 200 characters")
        .transform((v) => v.trim()),
      slug: slugSchema,
      biography: z.string().max(5000).optional(),
      imageUrl: z.url({ error: "Invalid image URL" }).optional(),
      nationality: z
        .string()
        .max(100)
        .transform((v) => v.trim())
        .optional(),
      spotifyUrl: z.url({ error: "Invalid Spotify URL" }).optional(),
      youtubeUrl: z.url({ error: "Invalid YouTube URL" }).optional(),
    }),
  }),

  // Admin: update a reciter (all fields optional)
  update: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(200)
        .transform((v) => v.trim())
        .optional(),
      slug: slugSchema.optional(),
      biography: z.string().max(5000).optional(),
      imageUrl: z.url({ error: "Invalid image URL" }).optional(),
      nationality: z
        .string()
        .max(100)
        .transform((v) => v.trim())
        .optional(),
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

  // Pagination + search query
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
    }),
  }),
};
