import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";
import { ApiResponse } from "../utils/response";

export const validate =
  (schema: ZodObject<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map(
          (issue: any) => `${issue.path.join(".")}: ${issue.message}`,
        );

        // Return a standardized error response with all validation issues
        return ApiResponse.error(res, "Validation failed", 400, errorMessages);
      }
      return ApiResponse.error(res, "Internal validation error", 500);
    }
  };
