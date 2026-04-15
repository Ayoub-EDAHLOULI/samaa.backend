import { Request, Response, NextFunction } from "express";
import { blogCategoryService } from "./blogcategories.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const blogCategoryController = {
  /**
   * Get all active categories (Public/Frontend)
   */
  async getAllBlogCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = (req.query.lang as string) || "en";
      const categories = await blogCategoryService.getAllBlogCategories(lang);

      return ApiResponse.success(
        res,
        categories,
        "Blog categories retrieved successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  /**
   * Get paginated categories (Admin)
   */
  async getPaginatedBlogCategories(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;
      const lang = (req.query.lang as string) || "en";
      const isActive = req.query.isActive as string | undefined; // "true" or "false"
      const search = req.query.search as string | undefined;

      const result = await blogCategoryService.getPaginatedBlogCategories({
        page,
        pageSize,
        languageCode: lang,
        isActive,
        search,
      });

      return ApiResponse.success(
        res,
        result,
        "Blog categories retrieved successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  /**
   * Get category by ID
   */
  async getBlogCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const lang = req.query.lang as string | undefined;

      const category = await blogCategoryService.getBlogCategoryById(id, lang);

      return ApiResponse.success(
        res,
        category,
        "Blog category retrieved successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  /**
   * Get category by Handle
   */
  async getBlogCategoryByHandle(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { handle } = req.params;
      const lang = (req.query.lang as string) || "en";

      const category = await blogCategoryService.getBlogCategoryByHandle(
        handle as string,
        lang,
      );

      return ApiResponse.success(
        res,
        category,
        "Blog category retrieved successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  /**
   * Create category
   */
  async createBlogCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await blogCategoryService.createBlogCategory(req.body);

      return ApiResponse.success(
        res,
        category,
        "Blog category created successfully",
        StatusCodes.CREATED,
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  /**
   * Update category
   */
  async updateBlogCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const category = await blogCategoryService.updateBlogCategory(
        id,
        req.body,
      );

      return ApiResponse.success(
        res,
        category,
        "Blog category updated successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  /**
   * Update specific translation
   */
  async updateBlogCategoryTranslation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const id = Number(req.params.id);
      const { languageCode } = req.params;

      const translation =
        await blogCategoryService.updateBlogCategoryTranslation(
          id,
          languageCode as string,
          req.body,
        );

      return ApiResponse.success(
        res,
        translation,
        "Blog category translation updated successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  /**
   * Delete category
   */
  async deleteBlogCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await blogCategoryService.deleteBlogCategory(id);

      return ApiResponse.success(
        res,
        null,
        "Blog category deleted successfully",
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },
};
