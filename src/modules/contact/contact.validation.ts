import { z } from "zod";

export const CONTACT_SUBJECTS = [
  "general",
  "support",
  "reciter",
  "partnership",
  "press",
  "careers",
] as const;

export const contactValidation = {
  submit: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters"),
      email: z.string().email("Invalid email address"),
      subject: z.enum(CONTACT_SUBJECTS, {
        error: "Invalid subject",
      }),
      message: z
        .string()
        .min(10, "Message must be at least 10 characters")
        .max(5000, "Message must be at most 5000 characters"),
    }),
  }),
};
