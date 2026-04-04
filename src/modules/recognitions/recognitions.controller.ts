import { Request, Response } from "express";
import { Role } from "@prisma/client";
import { recognitionsService } from "./recognitions.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const recognitionsController = {
  // POST /recognitions/identify
  async identify(req: Request, res: Response) {
    try {
      if (!req.file) {
        throw new AppError("No audio file provided", StatusCodes.BAD_REQUEST);
      }

      // audioDuration and deviceOs are optional fields sent as multipart form-data fields
      const audioDuration = req.body.audioDuration
        ? parseFloat(req.body.audioDuration as string)
        : undefined;
      const deviceOs = (req.body.deviceOs as string) || undefined;

      const result = await recognitionsService.processAudio(req.file, {
        userId: req.user?.userId,
        audioDuration,
        deviceOs,
      });

      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(
        res,
        "Failed to process audio",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  // GET /recognitions/history  (authenticated user)
  async getHistory(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      }

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

      const result = await recognitionsService.getUserHistory(
        req.user.userId,
        page,
        limit,
      );

      return ApiResponse.success(res, result, "History retrieved successfully");
    } catch (error) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(
        res,
        "Failed to fetch history",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  // DELETE /recognitions/:id  (user deletes own, admin deletes any)
  async deleteRecognition(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      }

      await recognitionsService.deleteRecognition(
        req.params.id as string,
        req.user.userId,
        req.user.role === Role.ADMIN,
      );

      return ApiResponse.success(res, null, "Recognition deleted successfully");
    } catch (error) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(
        res,
        "Failed to delete recognition",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  // GET /recognitions  (admin — all recognitions with optional filters)
  async getAllRecognitions(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const reciterId = (req.query.reciterId as string) || undefined;
      const userId = (req.query.userId as string) || undefined;

      const result = await recognitionsService.getAllRecognitions({
        page,
        limit,
        reciterId,
        userId,
      });

      return ApiResponse.success(
        res,
        result,
        "Recognitions retrieved successfully",
      );
    } catch (error) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(
        res,
        "Failed to fetch recognitions",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },
};
