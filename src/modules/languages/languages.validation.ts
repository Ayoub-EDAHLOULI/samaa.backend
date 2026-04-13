import { z } from "zod";

export const languageValidation = {
  create: z.object({
    body: z.object({
      code: z
        .string()
        .length(2, "Language code must be exactly 2 characters (ISO 639-1)")
        .toLowerCase()
        .regex(
          /^[a-z]{2}$/,
          "Language code must contain only lowercase letters",
        ),
      name: z
        .string()
        .min(2, "Language name must be at least 2 characters")
        .max(50, "Language name must not exceed 50 characters"),
      isDefault: z.boolean().optional().default(false),
      isActive: z.boolean().optional().default(true),
    }),
  }),

  update: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Language name must be at least 2 characters")
        .max(50, "Language name must not exceed 50 characters")
        .optional(),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }),
  }),

  params: z.object({
    params: z.object({
      code: z.string().length(2, "Invalid language code"),
    }),
  }),
};
