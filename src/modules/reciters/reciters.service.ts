import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import {
  CreateReciterDto,
  UpdateReciterDto,
  ReciterResponse,
  ReciterDetailResponse,
  ToggleFavoriteResult,
} from "./reciters.types";

// Shared select — used in list queries
const reciterSelect = {
  id: true,
  name: true,
  slug: true,
  biography: true,
  imageUrl: true,
  nationality: true,
  spotifyUrl: true,
  youtubeUrl: true,
  totalDiscoveries: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { favoritedBy: true } },
} as const;

function formatReciter(raw: {
  id: string;
  name: string;
  slug: string;
  biography: string | null;
  imageUrl: string | null;
  nationality: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  totalDiscoveries: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { favoritedBy: number };
}): ReciterResponse {
  const { _count, ...rest } = raw;
  return { ...rest, favoritesCount: _count.favoritedBy };
}

export const reciterService = {
  // ---------------------------------------------------------------------------
  // List all reciters — paginated + optional search (Public)
  // ---------------------------------------------------------------------------
  async getAllReciters(page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { nationality: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [reciters, total] = await Promise.all([
      prisma.reciter.findMany({
        where,
        select: reciterSelect,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.reciter.count({ where }),
    ]);

    return {
      data: reciters.map(formatReciter),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // ---------------------------------------------------------------------------
  // Trending reciters — ordered by totalDiscoveries (Public)
  // ---------------------------------------------------------------------------
  async getTrendingReciters(limit: number = 10): Promise<ReciterResponse[]> {
    const reciters = await prisma.reciter.findMany({
      select: reciterSelect,
      orderBy: { totalDiscoveries: "desc" },
      take: limit,
    });

    return reciters.map(formatReciter);
  },

  // ---------------------------------------------------------------------------
  // Get reciter by slug with isFavorited (Public — optionalAuth)
  // ---------------------------------------------------------------------------
  async getReciterBySlug(
    slug: string,
    userId?: string,
  ): Promise<ReciterDetailResponse> {
    const reciter = await prisma.reciter.findUnique({
      where: { slug },
      select: reciterSelect,
    });

    if (!reciter) {
      throw new AppError("Reciter not found", StatusCodes.NOT_FOUND);
    }

    let isFavorited: boolean | null = null;

    if (userId) {
      const favorite = await prisma.favoriteReciter.findUnique({
        where: { userId_reciterId: { userId, reciterId: reciter.id } },
      });
      isFavorited = favorite !== null;
    }

    return { ...formatReciter(reciter), isFavorited };
  },

  // ---------------------------------------------------------------------------
  // Create reciter (Admin)
  // ---------------------------------------------------------------------------
  async createReciter(data: CreateReciterDto): Promise<ReciterResponse> {
    const slugTaken = await prisma.reciter.findUnique({
      where: { slug: data.slug },
    });

    if (slugTaken) {
      throw new AppError(
        `Slug "${data.slug}" is already in use`,
        StatusCodes.CONFLICT,
      );
    }

    const reciter = await prisma.reciter.create({
      data: {
        name: data.name,
        slug: data.slug,
        biography: data.biography,
        imageUrl: data.imageUrl,
        nationality: data.nationality,
        spotifyUrl: data.spotifyUrl,
        youtubeUrl: data.youtubeUrl,
      },
      select: reciterSelect,
    });

    return formatReciter(reciter);
  },

  // ---------------------------------------------------------------------------
  // Update reciter (Admin)
  // ---------------------------------------------------------------------------
  async updateReciter(
    id: string,
    data: UpdateReciterDto,
  ): Promise<ReciterResponse> {
    const reciter = await prisma.reciter.findUnique({ where: { id } });

    if (!reciter) {
      throw new AppError("Reciter not found", StatusCodes.NOT_FOUND);
    }

    // Check slug uniqueness only if slug is being changed
    if (data.slug && data.slug !== reciter.slug) {
      const slugTaken = await prisma.reciter.findUnique({
        where: { slug: data.slug },
      });

      if (slugTaken) {
        throw new AppError(
          `Slug "${data.slug}" is already in use`,
          StatusCodes.CONFLICT,
        );
      }
    }

    const updated = await prisma.reciter.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.biography !== undefined && { biography: data.biography }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.nationality !== undefined && {
          nationality: data.nationality,
        }),
        ...(data.spotifyUrl !== undefined && { spotifyUrl: data.spotifyUrl }),
        ...(data.youtubeUrl !== undefined && { youtubeUrl: data.youtubeUrl }),
      },
      select: reciterSelect,
    });

    return formatReciter(updated);
  },

  // ---------------------------------------------------------------------------
  // Delete reciter (Admin)
  // Blocked if reciter has recognitions — would wipe user history.
  // ---------------------------------------------------------------------------
  async deleteReciter(id: string): Promise<void> {
    const reciter = await prisma.reciter.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { recognitions: true } },
      },
    });

    if (!reciter) {
      throw new AppError("Reciter not found", StatusCodes.NOT_FOUND);
    }

    if (reciter._count.recognitions > 0) {
      throw new AppError(
        `Cannot delete "${reciter.name}" — they have ${reciter._count.recognitions} recognition(s) in user history. Reassign or clear them first.`,
        StatusCodes.CONFLICT,
      );
    }

    await prisma.reciter.delete({ where: { id } });
  },

  // ---------------------------------------------------------------------------
  // Toggle favorite (Authenticated)
  // Uses composite PK on FavoriteReciter so upsert-style toggle is clean.
  // ---------------------------------------------------------------------------
  async toggleFavorite(
    userId: string,
    reciterId: string,
  ): Promise<ToggleFavoriteResult> {
    const reciter = await prisma.reciter.findUnique({
      where: { id: reciterId },
    });

    if (!reciter) {
      throw new AppError("Reciter not found", StatusCodes.NOT_FOUND);
    }

    const existing = await prisma.favoriteReciter.findUnique({
      where: { userId_reciterId: { userId, reciterId } },
    });

    if (existing) {
      await prisma.favoriteReciter.delete({
        where: { userId_reciterId: { userId, reciterId } },
      });
      return { isFavorited: false };
    }

    await prisma.favoriteReciter.create({ data: { userId, reciterId } });
    return { isFavorited: true };
  },
};
