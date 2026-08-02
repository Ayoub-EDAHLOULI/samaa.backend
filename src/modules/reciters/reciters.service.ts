import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import {
  CreateReciterDto,
  UpdateReciterDto,
  ReciterResponse,
  AdminReciterResponse,
  ReciterDetailResponse,
  ReciterTranslationResponse,
  ToggleFavoriteResult,
  VoiceMatchResult,
} from "./reciters.types";

const EMBEDDING_DIMENSIONS = 192;

// ---------------------------------------------------------------------------
// Internal helper — raw Prisma shape returned by buildSelect
// ---------------------------------------------------------------------------
interface RawReciter {
  id: string;
  slug: string;
  imageUrl: string | null;
  countryCode: string | null;
  style: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  totalDiscoveries: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { favoritedBy: number };
  translations: {
    language: string;
    name: string;
    nationality: string | null;
    shortBio: string | null;
    biography: string | null;
    seoTitle: string | null;
    tags: string | null;
  }[];
}

// Build the Prisma select that returns core fields + one language's translation
function buildSelect(lang: string) {
  return {
    id: true,
    slug: true,
    imageUrl: true,
    countryCode: true,
    style: true,
    spotifyUrl: true,
    youtubeUrl: true,
    totalDiscoveries: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { favoritedBy: true } },
    translations: {
      where: { language: lang },
      take: 1,
      select: {
        language: true,
        name: true,
        nationality: true,
        shortBio: true,
        biography: true,
        seoTitle: true,
        tags: true,
      },
    },
  };
}

function formatTranslation(
  t: RawReciter["translations"][0],
): ReciterTranslationResponse {
  return {
    language: t.language,
    name: t.name,
    nationality: t.nationality,
    shortBio: t.shortBio,
    biography: t.biography,
    seoTitle: t.seoTitle,
    tags: t.tags,
  };
}

function formatReciter(raw: RawReciter): ReciterResponse {
  const { _count, translations, ...rest } = raw;
  return {
    ...rest,
    favoritesCount: _count.favoritedBy,
    translation: translations[0] ? formatTranslation(translations[0]) : null,
  };
}

export const reciterService = {
  // ---------------------------------------------------------------------------
  // List all reciters — paginated + optional search (Public)
  // ---------------------------------------------------------------------------
  async getAllReciters(
    page: number = 1,
    limit: number = 20,
    search?: string,
    lang: string = "en",
  ) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          translations: {
            some: {
              language: lang,
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                {
                  nationality: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        }
      : {};

    const [reciters, total] = await Promise.all([
      prisma.reciter.findMany({
        where,
        select: buildSelect(lang),
        orderBy: { slug: "asc" },
        skip,
        take: limit,
      }),
      prisma.reciter.count({ where }),
    ]);

    return {
      data: (reciters as unknown as RawReciter[]).map(formatReciter),
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
  async getTrendingReciters(
    limit: number = 10,
    lang: string = "en",
  ): Promise<ReciterResponse[]> {
    const reciters = await prisma.reciter.findMany({
      select: buildSelect(lang),
      orderBy: { totalDiscoveries: "desc" },
      take: limit,
    });

    return (reciters as unknown as RawReciter[]).map(formatReciter);
  },

  // ---------------------------------------------------------------------------
  // Get reciter by slug with isFavorited (Public — optionalAuth)
  // ---------------------------------------------------------------------------
  async getReciterBySlug(
    slug: string,
    userId?: string,
    lang: string = "en",
  ): Promise<ReciterDetailResponse> {
    const reciter = await prisma.reciter.findUnique({
      where: { slug },
      select: buildSelect(lang),
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

    return {
      ...formatReciter(reciter as unknown as RawReciter),
      isFavorited,
    };
  },

  // ---------------------------------------------------------------------------
  // Get reciter by ID — returns all translations (Admin edit forms)
  // ---------------------------------------------------------------------------
  async getReciterById(id: string): Promise<AdminReciterResponse> {
    const reciter = await prisma.reciter.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        imageUrl: true,
        countryCode: true,
        style: true,
        spotifyUrl: true,
        youtubeUrl: true,
        totalDiscoveries: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { favoritedBy: true } },
        translations: {
          select: {
            language: true,
            name: true,
            nationality: true,
            shortBio: true,
            biography: true,
            seoTitle: true,
            tags: true,
          },
        },
      },
    });

    if (!reciter) {
      throw new AppError("Reciter not found", StatusCodes.NOT_FOUND);
    }

    const { _count, translations, ...rest } = reciter;
    return {
      ...rest,
      favoritesCount: _count.favoritedBy,
      translations: translations.map(formatTranslation),
    };
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

    const lang = data.language ?? "en";

    const reciter = await prisma.reciter.create({
      data: {
        slug: data.slug,
        imageUrl: data.imageUrl,
        countryCode: data.countryCode,
        style: data.style,
        spotifyUrl: data.spotifyUrl,
        youtubeUrl: data.youtubeUrl,
        translations: {
          create: {
            language: lang,
            name: data.name,
            nationality: data.nationality,
            shortBio: data.shortBio,
            biography: data.biography,
            seoTitle: data.seoTitle,
            tags: data.tags,
          },
        },
      },
      select: buildSelect(lang),
    });

    return formatReciter(reciter as unknown as RawReciter);
  },

  // ---------------------------------------------------------------------------
  // Update reciter (Admin)
  // Core fields and the specified language's translation are upserted together.
  // ---------------------------------------------------------------------------
  async updateReciter(
    id: string,
    data: UpdateReciterDto,
  ): Promise<ReciterResponse> {
    const reciter = await prisma.reciter.findUnique({ where: { id } });

    if (!reciter) {
      throw new AppError("Reciter not found", StatusCodes.NOT_FOUND);
    }

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

    const lang = data.language ?? "en";

    const hasTranslationData = [
      data.name,
      data.nationality,
      data.shortBio,
      data.biography,
      data.seoTitle,
      data.tags,
    ].some((v) => v !== undefined);

    const updated = await prisma.reciter.update({
      where: { id },
      data: {
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.countryCode !== undefined && {
          countryCode: data.countryCode,
        }),
        ...(data.style !== undefined && { style: data.style }),
        ...(data.spotifyUrl !== undefined && { spotifyUrl: data.spotifyUrl }),
        ...(data.youtubeUrl !== undefined && { youtubeUrl: data.youtubeUrl }),
        ...(hasTranslationData && {
          translations: {
            upsert: {
              where: {
                reciterId_language: { reciterId: id, language: lang },
              },
              update: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.nationality !== undefined && {
                  nationality: data.nationality,
                }),
                ...(data.shortBio !== undefined && { shortBio: data.shortBio }),
                ...(data.biography !== undefined && {
                  biography: data.biography,
                }),
                ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
                ...(data.tags !== undefined && { tags: data.tags }),
              },
              create: {
                language: lang,
                name: data.name ?? "",
                nationality: data.nationality,
                shortBio: data.shortBio,
                biography: data.biography,
                seoTitle: data.seoTitle,
                tags: data.tags,
              },
            },
          },
        }),
      },
      select: buildSelect(lang),
    });

    return formatReciter(updated as unknown as RawReciter);
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
        slug: true,
        translations: {
          where: { language: "en" },
          take: 1,
          select: { name: true },
        },
        _count: { select: { recognitions: true } },
      },
    });

    if (!reciter) {
      throw new AppError("Reciter not found", StatusCodes.NOT_FOUND);
    }

    const name = reciter.translations[0]?.name ?? reciter.slug;

    if (reciter._count.recognitions > 0) {
      throw new AppError(
        `Cannot delete "${name}" — they have ${reciter._count.recognitions} recognition(s) in user history. Reassign or clear them first.`,
        StatusCodes.CONFLICT,
      );
    }

    await prisma.reciter.delete({ where: { id } });
  },

  // ---------------------------------------------------------------------------
  // Toggle favorite (Authenticated)
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

  // ---------------------------------------------------------------------------
  // Save image file to disk
  // Returns the public URL path, e.g. /uploads/reciters/abc123.jpg
  // ---------------------------------------------------------------------------
  async saveImageFile(
    file: Express.Multer.File,
    oldImageUrl?: string | null,
  ): Promise<string> {
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExt.includes(ext)) {
      throw new AppError(
        `Unsupported image format "${ext}". Allowed: JPG, PNG, WEBP`,
        StatusCodes.BAD_REQUEST,
      );
    }

    const fileName = `${crypto.randomBytes(8).toString("hex")}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "reciters");
    const uploadPath = path.join(uploadDir, fileName);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(uploadPath, file.buffer);

    if (oldImageUrl && oldImageUrl.startsWith("/uploads/reciters/")) {
      const oldPath = path.join(process.cwd(), "public", oldImageUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    return `/uploads/reciters/${fileName}`;
  },

  // ---------------------------------------------------------------------------
  // Voice identification — nearest-neighbor search over reciter_embeddings.
  //
  // Each reciter has one embedding PER ENROLLMENT RECORDING (multi-enrollment),
  // and a reciter's score is their BEST recording's similarity (MIN distance).
  // This is what lets a query generalize across Surahs: the query only needs
  // to be close to ANY of the reciter's enrolled recordings, not to a single
  // averaged voice print that blurs recording sessions together.
  //
  // pgvector's `<=>` operator returns COSINE DISTANCE, not similarity:
  //   distance = 1 - cosine_similarity
  // so a perfect match has distance 0. We flip it back to similarity
  // (1 - distance) before returning, since that's the intuitive
  // "0.0 - 1.0, higher is better" scale the rest of the app uses
  // (see CONFIDENCE_THRESHOLD in recognitions.service.ts).
  // ---------------------------------------------------------------------------
  async findClosestByEmbedding(
    embedding: number[],
    language: string = "en",
  ): Promise<VoiceMatchResult | null> {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new AppError(
        `Expected a ${EMBEDDING_DIMENSIONS}-dimension embedding, got ${embedding.length}`,
        StatusCodes.BAD_REQUEST,
      );
    }

    // pgvector expects the literal form "[0.1,0.2,...]" cast to ::vector.
    // Prisma.sql keeps this as a single bound parameter (not string-interpolated
    // SQL), so this is not vulnerable to injection despite building raw SQL.
    const vectorLiteral = `[${embedding.join(",")}]`;

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        imageUrl: string | null;
        name: string | null;
        distance: number;
      }>
    >(Prisma.sql`
      SELECT
        r.id,
        r.slug,
        r."imageUrl",
        rt.name,
        MIN(re.embedding <=> ${vectorLiteral}::vector) AS distance
      FROM reciter_embeddings re
      JOIN reciters r ON r.id = re."reciterId"
      LEFT JOIN reciter_translations rt
        ON rt."reciterId" = r.id AND rt.language = ${language}
      GROUP BY r.id, r.slug, r."imageUrl", rt.name
      ORDER BY distance ASC
      LIMIT 1
    `);

    const match = rows[0];
    if (!match) {
      return null;
    }

    return {
      id: match.id,
      slug: match.slug,
      imageUrl: match.imageUrl,
      name: match.name ?? match.slug,
      similarity: 1 - match.distance,
    };
  },
};
