import { Request, Response, NextFunction } from "express";

/**
 * Generic Middleware to parse form-data fields before Zod validation.
 * Crucial for multipart/form-data (Multer) where all appended fields are strings.
 */
export const parseFormData = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.body && typeof req.body === "object") {
    Object.keys(req.body).forEach((key) => {
      const value = req.body[key];

      // 1. Trim strings automatically (prevents accidental whitespace in Qari names or URLs)
      if (typeof value === "string") {
        req.body[key] = value.trim();
      }

      // 2. Convert string booleans to actual booleans
      if (value === "true") {
        req.body[key] = true;
      } else if (value === "false") {
        req.body[key] = false;
      }

      // 3. Attempt to parse stringified JSON (useful if the mobile app sends stringified arrays/objects)
      if (
        typeof value === "string" &&
        (value.startsWith("[") || value.startsWith("{"))
      ) {
        try {
          req.body[key] = JSON.parse(value);
        } catch (e) {
          // If it fails to parse, We leave it as a string. Zod will catch the invalid format later.
        }
      }
    });
  }

  next();
};
