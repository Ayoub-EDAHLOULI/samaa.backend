import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { jwtUtils, JwtPayload } from "../utils/jwt";
import { AppError } from "../utils/errors";
import { StatusCodes } from "../constants/status-codes";
import { prisma } from "../../lib/prisma";

// Extend Express Request to carry the authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authenticate — validates the Bearer access token and attaches user to req.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Access token is missing or invalid",
        StatusCodes.UNAUTHORIZED,
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwtUtils.verifyAccessToken(token);

    // Confirm the user still exists in the DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new AppError("User no longer exists", StatusCodes.UNAUTHORIZED);
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(
      new AppError("Invalid or expired token", StatusCodes.UNAUTHORIZED),
    );
  }
};

/**
 * Authorize — restricts access to the specified roles.
 * Usage: authorize([Role.ADMIN]) or authorize([Role.ADMIN, Role.USER])
 */
export const authorize = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new AppError("Authentication required", StatusCodes.UNAUTHORIZED),
      );
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      return next(
        new AppError(
          "You do not have permission to perform this action",
          StatusCodes.FORBIDDEN,
        ),
      );
    }

    next();
  };
};

/**
 * Optional auth — attaches user if a valid token is present, otherwise continues.
 * Used on recognition endpoints that work for both guests and authenticated users.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwtUtils.verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (user) {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch {
    // Invalid token — continue as guest
    next();
  }
};

/**
 * Check ownership — ensures a user can only access their own resource.
 * Admins bypass this check. IDs are UUIDs (strings).
 */
export const checkOwnership = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(
      new AppError("Authentication required", StatusCodes.UNAUTHORIZED),
    );
  }

  if (req.user.role === Role.ADMIN) {
    return next();
  }

  if (req.user.userId !== req.params.id) {
    return next(
      new AppError("You can only access your own data", StatusCodes.FORBIDDEN),
    );
  }

  next();
};
