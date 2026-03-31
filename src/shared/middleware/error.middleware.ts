import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { StatusCodes } from "../constants/status-codes";
import { ApiResponse } from "../utils/response";
import { Prisma } from "@prisma/client";

export const errorMiddleware = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Default error
  let statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";

  // Handle operational errors (AppError)
  if (error instanceof AppError && error.isOperational) {
    statusCode = error.statusCode;
    message = error.message;
  }

  // Handle Multer file type errors (Dynamically catches our custom audio/image messages)
  if (
    error.message &&
    (error.message.includes("Invalid audio type") ||
      error.message.includes("Invalid image type"))
  ) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = error.message; // Passes through the exact message we wrote in multer.ts
  }

  // Handle file size errors from Multer
  if (error.message && error.message.includes("File too large")) {
    statusCode = StatusCodes.BAD_REQUEST;
    message =
      "File size exceeds the allowed limit (15MB for audio, 5MB for images)";
  }

  // Handle unexpected field error from Multer
  if (error.message && error.message.includes("Unexpected field")) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Invalid file upload key. Check your form-data field names.";
  }

  // Handle Prisma errors using built-in Prisma types instead of 'any'
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = StatusCodes.CONFLICT;
      message = "A record with this unique value already exists";
    } else if (error.code === "P2025") {
      statusCode = StatusCodes.NOT_FOUND;
      message = "Record not found";
    }
  }

  // Catch remaining unhandled Multer errors
  if (error.name === "MulterError") {
    statusCode = StatusCodes.BAD_REQUEST;
    message = `Upload error: ${error.message}`;
  }

  // Log critical 500 errors for debugging
  if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
    console.error("🔥 CRITICAL ERROR:", error);
  }

  return ApiResponse.error(res, message, statusCode);
};
