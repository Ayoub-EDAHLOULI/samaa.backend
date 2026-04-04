import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must not exceed 100 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  );

const emailSchema = z
  .email({ error: "Invalid email format" })
  .transform((v) => v.toLowerCase().trim());

export const authValidation = {
  register: z.object({
    body: z.object({
      displayName: z
        .string()
        .min(2, "Display name must be at least 2 characters")
        .max(100, "Display name must not exceed 100 characters")
        .transform((v) => v.trim()),
      email: emailSchema,
      password: passwordSchema,
    }),
  }),

  login: z.object({
    body: z.object({
      email: emailSchema,
      password: z.string().min(1, "Password is required"),
    }),
  }),

  // Refresh token is read from the httpOnly cookie — no body validation needed
  refreshToken: z.object({}),

  changePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: passwordSchema,
    }),
  }),

  updateProfile: z.object({
    body: z.object({
      displayName: z
        .string()
        .min(2, "Display name must be at least 2 characters")
        .max(100)
        .transform((v) => v.trim())
        .optional(),
      avatarUrl: z.url({ error: "Invalid avatar URL" }).optional(),
    }),
  }),

  forgotPassword: z.object({
    body: z.object({
      email: emailSchema,
    }),
  }),

  resetPassword: z.object({
    body: z.object({
      token: z.string().min(1, "Reset token is required"),
      newPassword: passwordSchema,
    }),
  }),

  verifyEmail: z.object({
    query: z.object({
      token: z.string().min(1, "Verification token is required"),
    }),
  }),
};
