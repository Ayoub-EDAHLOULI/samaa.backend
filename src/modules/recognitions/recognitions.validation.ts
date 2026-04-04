import { z } from "zod";

export const recognitionValidation = {
  // UUID param — for DELETE /recognitions/:id
  idParam: z.object({
    params: z.object({
      id: z.uuid({ error: "Invalid recognition ID — must be a UUID" }),
    }),
  }),

  // Paginated history query (user)
  listQuery: z.object({
    query: z.object({
      page: z
        .string()
        .optional()
        .transform((v) => (v ? Math.max(1, parseInt(v)) : 1)),
      limit: z
        .string()
        .optional()
        .transform((v) => (v ? Math.min(50, Math.max(1, parseInt(v))) : 20)),
    }),
  }),

  // Admin analytics query — filter by reciter and/or user
  adminListQuery: z.object({
    query: z.object({
      page: z
        .string()
        .optional()
        .transform((v) => (v ? Math.max(1, parseInt(v)) : 1)),
      limit: z
        .string()
        .optional()
        .transform((v) => (v ? Math.min(100, Math.max(1, parseInt(v))) : 20)),
      reciterId: z.uuid({ error: "reciterId must be a UUID" }).optional(),
      userId: z.uuid({ error: "userId must be a UUID" }).optional(),
    }),
  }),
};
