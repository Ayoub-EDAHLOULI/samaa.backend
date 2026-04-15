import { Request, Response, NextFunction } from "express";
import { blogPostService } from "./blogposts.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const blogPostController = {
  /*
   * Public - Get Paginated Posts (with optional filters)
   * Supports: search, categoryId, authorId, isPublished, sortBy
   * Example: /api/v1/blog-posts?search=energy&categoryId=2&isPublished=true&page=1&pageSize=10&lang=en
   **/
  async getAllPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page,
        pageSize,
        lang,
        search,
        categoryId,
        authorId,
        isPublished,
        sortBy,
      } = req.query;

      const result = await blogPostService.getPaginatedPosts({
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 12,
        languageCode: (lang as string) || "en",
        search: search as string,
        categoryId: categoryId ? Number(categoryId) : undefined,
        authorId: authorId ? String(authorId) : undefined,
        isPublished: isPublished as string,
        sortBy: sortBy as any,
      });

      return ApiResponse.success(res, result, "Posts retrieved successfully");
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  // Public - Get Posts by Category (with optional filters)
  async getPostsByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page,
        pageSize,
        lang,
        search,
        categoryId,
        categoryHandle,
        authorId,
        isPublished,
        sortBy,
      } = req.query;

      const result = await blogPostService.getPaginatedPostsByCategory({
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 12,
        languageCode: (lang as string) || "en",
        search: search as string,
        categoryId: categoryId ? Number(categoryId) : undefined,
        categoryHandle: categoryHandle as string,
        authorId: authorId ? String(authorId) : undefined,
        isPublished: isPublished as string,
        sortBy: sortBy as any,
      });

      return ApiResponse.success(res, result, "Posts retrieved successfully");
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  // Public - Get by Handle
  async getPostByHandle(req: Request, res: Response, next: NextFunction) {
    try {
      const { handle } = req.params;
      const lang = (req.query.lang as string) || "en";

      const post = await blogPostService.getPostByHandle(
        handle as string,
        lang,
      );
      return ApiResponse.success(res, post, "Post retrieved successfully");
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  // Admin - Get by ID
  async getPostById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const post = await blogPostService.getPostById(id);
      return ApiResponse.success(res, post, "Post retrieved successfully");
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  // Admin - Create
  async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Try finding the user in both common locations
      const user = (req as any).user || res.locals.user;
      const userId = user?.userId;

      // 2. Debug Log (Check your server terminal if this error persists)
      if (!userId) {
        throw new AppError("User not authenticated", StatusCodes.UNAUTHORIZED);
      }

      // 3. Merge userId securely into the body data
      // This OVERRIDES whatever the frontend sent in 'authorId'
      const postData = {
        ...req.body,
        authorId: userId,
      };

      const post = await blogPostService.createPost(postData, req.file);

      return ApiResponse.success(
        res,
        post,
        "Post created successfully",
        StatusCodes.CREATED,
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  // Admin - Update
  async updatePost(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const post = await blogPostService.updatePost(id, req.body, req.file);

      return ApiResponse.success(res, post, "Post updated successfully");
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },

  // Admin - Delete
  async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await blogPostService.deletePost(id);
      return ApiResponse.success(res, null, "Post deleted successfully");
    } catch (error: any) {
      if (error instanceof AppError) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      return ApiResponse.error(res, "Internal Server Error", 500);
    }
  },
};
