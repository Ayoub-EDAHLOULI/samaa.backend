import { prisma } from "../../lib/prisma";
import { passwordUtils } from "../../shared/utils/password";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponse,
  UserStats,
} from "./users.types";

export const userService = {
  // ---------------------------------------------------------------------------
  // Get all users — paginated + optional search (Admin)
  // ---------------------------------------------------------------------------
  async getAllUsers(page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { displayName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          role: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { recognitions: true, favorites: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // ---------------------------------------------------------------------------
  // Get single user by ID (Admin)
  // ---------------------------------------------------------------------------
  async getUserById(id: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { recognitions: true, favorites: true },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    return user;
  },

  // ---------------------------------------------------------------------------
  // Create user (Admin — bypasses email verification flow)
  // ---------------------------------------------------------------------------
  async createUser(data: CreateUserDto): Promise<UserResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError("Email already in use", StatusCodes.CONFLICT);
    }

    const passwordHash = await passwordUtils.hash(data.password);

    const user = await prisma.user.create({
      data: {
        displayName: data.displayName,
        email: data.email,
        passwordHash,
        role: data.role ?? "USER",
        // Admin-created accounts are considered verified
        isEmailVerified: data.isEmailVerified ?? true,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },

  // ---------------------------------------------------------------------------
  // Update user (Admin)
  // ---------------------------------------------------------------------------
  async updateUser(id: string, data: UpdateUserDto): Promise<UserResponse> {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    if (data.email && data.email !== user.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailTaken) {
        throw new AppError("Email already in use", StatusCodes.CONFLICT);
      }
    }

    return prisma.user.update({
      where: { id },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.email && { email: data.email }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.role && { role: data.role }),
        ...(data.isEmailVerified !== undefined && {
          isEmailVerified: data.isEmailVerified,
        }),
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  // ---------------------------------------------------------------------------
  // Delete user (Admin — cannot delete other admins)
  // ---------------------------------------------------------------------------
  async deleteUser(id: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    if (user.role === "ADMIN") {
      throw new AppError("Cannot delete admin accounts", StatusCodes.FORBIDDEN);
    }

    await prisma.user.delete({ where: { id } });
  },

  // ---------------------------------------------------------------------------
  // Get user stats — Samaa-specific (recognitions, favorites, top reciter)
  // ---------------------------------------------------------------------------
  async getUserStats(userId: string): Promise<UserStats> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    const [totalRecognitions, totalFavorites, topGroups] = await Promise.all([
      prisma.recognition.count({ where: { userId } }),
      prisma.favoriteReciter.count({ where: { userId } }),
      // Group recognitions by reciter to find the most discovered one
      prisma.recognition.groupBy({
        by: ["reciterId"],
        where: { userId },
        _count: { reciterId: true },
        orderBy: { _count: { reciterId: "desc" } },
        take: 1,
      }),
    ]);

    // Count how many unique reciters the user has discovered
    const uniqueRecitersDiscovered = await prisma.recognition
      .findMany({
        where: { userId },
        select: { reciterId: true },
        distinct: ["reciterId"],
      })
      .then((rows) => rows.length);

    // Resolve the top reciter details if any recognitions exist
    let mostDiscoveredReciter: UserStats["mostDiscoveredReciter"] = null;

    if (topGroups.length > 0) {
      const topGroup = topGroups[0];
      const reciter = await prisma.reciter.findUnique({
        where: { id: topGroup.reciterId },
        select: {
          id: true,
          slug: true,
          imageUrl: true,
          translations: { where: { language: "en" }, take: 1, select: { name: true } },
        },
      });

      if (reciter) {
        mostDiscoveredReciter = {
          id: reciter.id,
          name: reciter.translations[0]?.name ?? reciter.slug,
          slug: reciter.slug,
          imageUrl: reciter.imageUrl,
          count: topGroup._count.reciterId,
        };
      }
    }

    return {
      totalRecognitions,
      uniqueRecitersDiscovered,
      totalFavorites,
      mostDiscoveredReciter,
    };
  },
};
