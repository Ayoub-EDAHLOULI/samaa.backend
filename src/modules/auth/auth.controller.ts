import { Request, Response } from "express";
import { authService } from "./auth.service";
import { ApiResponse } from "../../shared/utils/response";
import { StatusCodes } from "../../shared/constants/status-codes";
import { AppError } from "../../shared/utils/errors";

/**
 * Builds consistent httpOnly cookie options.
 * In production the domain is derived from the request hostname so the cookie
 * works across both the `www` and `api` subdomains.
 */
const getCookieOptions = (req: Request) => {
  const isProduction = process.env.NODE_ENV === "production";

  let domain: string | undefined;

  if (isProduction) {
    const parts = req.hostname.split(".");
    if (parts.length >= 2) {
      domain = `.${parts.slice(-2).join(".")}`;
    }
  }

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
    domain,
  };
};

export const authController = {
  // POST /auth/register
  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);
      res.cookie(
        "refreshToken",
        result.tokens.refreshToken,
        getCookieOptions(req),
      );

      return ApiResponse.success(
        res,
        { user: result.user, accessToken: result.tokens.accessToken },
        "Registration successful. Please check your email to verify your account.",
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

  // POST /auth/login
  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      res.cookie(
        "refreshToken",
        result.tokens.refreshToken,
        getCookieOptions(req),
      );

      return ApiResponse.success(
        res,
        { user: result.user, accessToken: result.tokens.accessToken },
        "Login successful",
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

  // POST /auth/refresh-token
  async refreshToken(req: Request, res: Response) {
    const cookieOptions = getCookieOptions(req);

    try {
      const rawToken = req.cookies.refreshToken as string | undefined;

      if (!rawToken) {
        return ApiResponse.error(
          res,
          "No refresh token provided",
          StatusCodes.UNAUTHORIZED,
        );
      }

      const tokens = await authService.refreshToken(rawToken);
      res.cookie("refreshToken", tokens.refreshToken, cookieOptions);

      return ApiResponse.success(
        res,
        { accessToken: tokens.accessToken },
        "Token refreshed",
      );
    } catch (error) {
      // Do NOT call res.clearCookie here. Clearing the httpOnly cookie on any
      // error (including transient DB errors or token-rotation race conditions)
      // causes the browser to discard the refreshToken cookie even when a
      // concurrent request just issued a valid new one, permanently locking
      // the user out. The token is already invalidated in the database; the
      // stale cookie is harmless and will be rejected on any subsequent attempt.
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

  // POST /auth/logout
  async logout(req: Request, res: Response) {
    const cookieOptions = getCookieOptions(req);

    try {
      const rawToken = req.cookies.refreshToken as string | undefined;

      if (rawToken) {
        await authService.logout(rawToken);
      }

      res.clearCookie("refreshToken", cookieOptions);

      return ApiResponse.success(res, null, "Logout successful");
    } catch {
      return ApiResponse.error(
        res,
        "Logout failed",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  // GET /auth/profile
  async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      }

      const profile = await authService.getProfile(req.user.userId);

      return ApiResponse.success(
        res,
        profile,
        "Profile retrieved successfully",
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

  // POST /auth/change-password
  async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      }

      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };

      await authService.changePassword(
        req.user.userId,
        currentPassword,
        newPassword,
      );

      return ApiResponse.success(res, null, "Password changed successfully");
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

  // PUT /auth/profile
  async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return ApiResponse.error(
          res,
          "Authentication required",
          StatusCodes.UNAUTHORIZED,
        );
      }

      const updated = await authService.updateProfile(
        req.user.userId,
        req.body,
      );

      return ApiResponse.success(res, updated, "Profile updated successfully");
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

  // POST /auth/forgot-password
  async forgotPassword(req: Request, res: Response) {
    try {
      await authService.forgotPassword(req.body.email as string);

      return ApiResponse.success(
        res,
        null,
        "If an account with that email exists, a password reset link has been sent.",
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

  // POST /auth/reset-password
  async resetPassword(req: Request, res: Response) {
    try {
      await authService.resetPassword(req.body);

      return ApiResponse.success(
        res,
        null,
        "Password reset successfully. Please log in.",
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

  // GET /auth/verify-email?token=...
  async verifyEmail(req: Request, res: Response) {
    try {
      await authService.verifyEmail({ token: req.query.token as string });

      return ApiResponse.success(
        res,
        null,
        "Email verified successfully. You can now log in.",
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
};
