import { z } from "zod";

export const recognitionValidation = {
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
};
