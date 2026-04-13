import { z } from "zod";

export const languageValidation = {
  create: z.object({
    body: z.object({
      code: z
        .string()
        .min(2, "Language code must be at least 2 characters")
        .max(3, "Language code must be at most 3 characters")
        .toLowerCase()
        .regex(
          /^[a-z]{2,3}$/,
          "Language code must contain only lowercase letters (e.g. en, fr, ary)",
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
      code: z.string().min(2).max(3).regex(/^[a-z]{2,3}$/, "Invalid language code").toLowerCase(),
    }),
  }),
};
