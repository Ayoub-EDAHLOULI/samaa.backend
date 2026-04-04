import { Request, Response } from "express";
import { recognitionsService } from "./recognitions.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const recognitionsController = {
  async identify(req: Request, res: Response) {
    try {
      if (!req.file) {
        throw new AppError("No audio file provided", StatusCodes.BAD_REQUEST);
      }

      const userId = req.user?.userId;

      const result = await recognitionsService.processAudio(req.file, userId);

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

  async getHistory(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await recognitionsService.getUserHistory(
        req.user!.userId,
        page,
        limit,
      );

      return ApiResponse.success(res, result, "History retrieved successfully");
    } catch (error) {
      return ApiResponse.error(
        res,
        "Failed to fetch history",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },
};
