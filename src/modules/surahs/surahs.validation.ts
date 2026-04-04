import { z } from "zod";

export const surahValidation = {
  // Validates the :id param is a number between 1 and 114
  // NOTE: validate middleware does not write transforms back to req.params,
  // so the controller still receives a string and must call parseInt() itself.
  idParam: z.object({
    params: z.object({
      id: z
        .string()
        .regex(/^\d+$/, "Surah ID must be a number")
        .refine(
          (v) => {
            const n = parseInt(v);
            return n >= 1 && n <= 114;
          },
          { message: "Surah ID must be between 1 and 114" },
        ),
    }),
  }),

  // Admin: correct a surah's name or ayah count
  update: z.object({
    body: z.object({
      arabicName: z
        .string()
        .min(1, "Arabic name cannot be empty")
        .max(100)
        .transform((v) => v.trim())
        .optional(),
      englishName: z
        .string()
        .min(1, "English name cannot be empty")
        .max(100)
        .transform((v) => v.trim())
        .optional(),
      ayahCount: z
        .number()
        .int("Ayah count must be a whole number")
        .min(1, "Ayah count must be at least 1")
        .max(286, "Ayah count cannot exceed 286")
        .optional(),
    }),
  }),
};
