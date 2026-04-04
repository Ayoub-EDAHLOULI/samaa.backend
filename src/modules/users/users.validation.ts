import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must not exceed 100 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  );

export const userValidation = {
  // Admin: create a user manually
  create: z.object({
    body: z.object({
      displayName: z
        .string()
        .min(2, "Display name must be at least 2 characters")
        .max(100, "Display name must not exceed 100 characters")
        .transform((v) => v.trim()),
      email: z
        .email({ error: "Invalid email format" })
        .transform((v) => v.toLowerCase().trim()),
      password: passwordSchema,
      role: z.enum(["USER", "ADMIN"]).optional(),
      isEmailVerified: z.boolean().optional(),
    }),
  }),

  // Admin: update any user
  update: z.object({
    body: z.object({
      displayName: z
        .string()
        .min(2, "Display name must be at least 2 characters")
        .max(100)
        .transform((v) => v.trim())
        .optional(),
      email: z
        .email({ error: "Invalid email format" })
        .transform((v) => v.toLowerCase().trim())
        .optional(),
      avatarUrl: z.url({ error: "Invalid avatar URL" }).optional(),
      role: z.enum(["USER", "ADMIN"]).optional(),
      isEmailVerified: z.boolean().optional(),
    }),
  }),

  // UUID param validation
  params: z.object({
    params: z.object({
      id: z.uuid({ error: "Invalid user ID — must be a UUID" }),
    }),
  }),
};
