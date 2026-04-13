import { Request, Response, NextFunction } from "express";
import { languageService } from "./languages.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const languageController = {
  async getAllLanguages(req: Request, res: Response, next: NextFunction) {
    try {
      const activeOnly = req.query.activeOnly === "true";
      const languages = await languageService.getAllLanguages(activeOnly);

      return ApiResponse.success(
        res,
        languages,
        "Languages retrieved successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  async getLanguageByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const language = await languageService.getLanguageByCode(code as string);

      return ApiResponse.success(
        res,
        language,
        "Language retrieved successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  async createLanguage(req: Request, res: Response, next: NextFunction) {
    try {
      const language = await languageService.createLanguage(req.body);

      return ApiResponse.success(
        res,
        language,
        "Language created successfully",
        StatusCodes.CREATED,
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  async updateLanguage(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const language = await languageService.updateLanguage(
        code as string,
        req.body,
      );

      return ApiResponse.success(
        res,
        language,
        "Language updated successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  async deleteLanguage(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      await languageService.deleteLanguage(code as string);

      return ApiResponse.success(res, null, "Language deleted successfully");
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  async getDefaultLanguage(req: Request, res: Response, next: NextFunction) {
    try {
      const language = await languageService.getDefaultLanguage();

      return ApiResponse.success(
        res,
        language,
        "Default language retrieved successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },
};
