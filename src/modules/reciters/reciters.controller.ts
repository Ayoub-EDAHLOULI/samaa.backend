import { Request, Response } from "express";
import { reciterService } from "./reciters.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const reciterController = {
  // GET /reciters
  async getAllReciters(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const search = (req.query.search as string) || undefined;

      const result = await reciterService.getAllReciters(page, limit, search);

      return ApiResponse.success(
        res,
        result,
        "Reciters retrieved successfully",
      );
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

  // GET /reciters/trending
  async getTrendingReciters(req: Request, res: Response) {
    try {
      const limit = Math.min(Number(req.query.limit) || 10, 50);

      const reciters = await reciterService.getTrendingReciters(limit);

      return ApiResponse.success(
        res,
        reciters,
        "Trending reciters retrieved successfully",
      );
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

  // GET /reciters/:slug
  async getReciterBySlug(req: Request, res: Response) {
    try {
      const reciter = await reciterService.getReciterBySlug(
        req.params.slug as string,
        req.user?.userId,
      );

      return ApiResponse.success(
        res,
        reciter,
        "Reciter retrieved successfully",
      );
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

  // POST /reciters  (Admin)
  async createReciter(req: Request, res: Response) {
    try {
      const reciter = await reciterService.createReciter(req.body);

      return ApiResponse.success(
        res,
        reciter,
        "Reciter created successfully",
        StatusCodes.CREATED,
      );
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

  // PUT /reciters/:id  (Admin)
  async updateReciter(req: Request, res: Response) {
    try {
      const updated = await reciterService.updateReciter(
        req.params.id as string,
        req.body,
      );

      return ApiResponse.success(res, updated, "Reciter updated successfully");
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

  // DELETE /reciters/:id  (Admin)
  async deleteReciter(req: Request, res: Response) {
    try {
      await reciterService.deleteReciter(req.params.id as string);

      return ApiResponse.success(res, null, "Reciter deleted successfully");
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

  // POST /reciters/:id/favorite  (Authenticated)
  async toggleFavorite(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      }

      const result = await reciterService.toggleFavorite(
        req.user.userId,
        req.params.id as string,
      );

      const message = result.isFavorited
        ? "Reciter added to favorites"
        : "Reciter removed from favorites";

      return ApiResponse.success(res, result, message);
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
