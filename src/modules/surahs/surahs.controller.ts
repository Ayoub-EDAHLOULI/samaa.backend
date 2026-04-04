import { Request, Response } from "express";
import { surahService } from "./surahs.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const surahController = {
  // GET /surahs
  async getAllSurahs(_req: Request, res: Response) {
    try {
      const surahs = await surahService.getAllSurahs();

      return ApiResponse.success(res, surahs, "Surahs retrieved successfully");
    } catch (error) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(
        res,
        "Internal Server Error",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  // GET /surahs/:id
  async getSurahById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      const surah = await surahService.getSurahById(id);

      return ApiResponse.success(res, surah, "Surah retrieved successfully");
    } catch (error) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(
        res,
        "Internal Server Error",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  // PUT /surahs/:id  (Admin)
  async updateSurah(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      const updated = await surahService.updateSurah(id, req.body);

      return ApiResponse.success(res, updated, "Surah updated successfully");
    } catch (error) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(
        res,
        "Internal Server Error",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },
};
