import { Request, Response } from "express";
import { userService } from "./users.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

export const userController = {
  // GET /users — Admin only
  async getAllUsers(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const search = (req.query.search as string) || undefined;

      const result = await userService.getAllUsers(page, limit, search);

      return ApiResponse.success(res, result, "Users retrieved successfully");
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

  // GET /users/:id — Admin only
  async getUserById(req: Request, res: Response) {
    try {
      const user = await userService.getUserById(req.params.id as string);

      return ApiResponse.success(res, user, "User retrieved successfully");
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

  // POST /users — Admin only
  async createUser(req: Request, res: Response) {
    try {
      const user = await userService.createUser(req.body);

      return ApiResponse.success(
        res,
        user,
        "User created successfully",
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

  // PUT /users/:id — Admin only
  async updateUser(req: Request, res: Response) {
    try {
      const updated = await userService.updateUser(
        req.params.id as string,
        req.body,
      );

      return ApiResponse.success(res, updated, "User updated successfully");
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

  // DELETE /users/:id — Admin only
  async deleteUser(req: Request, res: Response) {
    try {
      await userService.deleteUser(req.params.id as string);

      return ApiResponse.success(res, null, "User deleted successfully");
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

  // GET /users/me/stats — authenticated user's own Samaa stats
  async getUserStats(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      }

      const stats = await userService.getUserStats(req.user.userId);

      return ApiResponse.success(res, stats, "Stats retrieved successfully");
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
