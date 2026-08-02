import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { extractEmbeddingFromAudio } from "../../shared/utils/axios-ai-client";
import { reciterService } from "../reciters/reciters.service";
import {
  ProcessAudioOptions,
  RecognitionResultResponse,
  RecognitionHistoryItem,
  AdminRecognitionItem,
} from "./recognitions.types";

// Minimum AI confidence required to accept a prediction (tunable via env)
const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD ?? "0.55");

// Shared select for recognition rows — used in history and admin list
const recognitionSelect = {
  id: true,
  confidenceScore: true,
  audioDuration: true,
  deviceOs: true,
  ayahNumber: true,
  createdAt: true,
  reciter: {
    select: { id: true, name: true, slug: true, imageUrl: true },
  },
  surah: {
    select: { id: true, arabicName: true, englishName: true },
  },
} as const;

export const recognitionsService = {
  // ---------------------------------------------------------------------------
  // Core AI pipeline — proxy audio to Python, evaluate, save, return result
  // ---------------------------------------------------------------------------
  async processAudio(
    file: Express.Multer.File,
    options: ProcessAudioOptions = {},
  ): Promise<RecognitionResultResponse> {
    const { userId, audioDuration, deviceOs } = options;

    // 1. Forward audio buffer to the Python microservice — returns a raw
    //    192-dim ECAPA-TDNN voice embedding, no matching done on that side
    const { embedding } = await extractEmbeddingFromAudio(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // 2. Nearest-neighbor search over Reciter.embedding via pgvector cosine distance
    const match = await reciterService.findClosestByEmbedding(embedding);

    if (!match) {
      return {
        isMatch: false,
        confidence: 0,
        message: "No enrolled reciters to compare against yet.",
      };
    }

    console.log(`🎙️  AI Prediction → reciter: "${match.name}" | similarity: ${(match.similarity * 100).toFixed(1)}% | threshold: ${(CONFIDENCE_THRESHOLD * 100).toFixed(1)}%`);

    // 3. Confidence gate — unclear audio returns 200 with isMatch: false
    if (match.similarity < CONFIDENCE_THRESHOLD) {
      console.log(`❌ Below threshold — returning "not clear enough"`);
      return {
        isMatch: false,
        confidence: match.similarity,
        message:
          "Audio not clear enough. Please try getting closer to the source.",
      };
    }

    const reciter = { id: match.id, slug: match.slug, imageUrl: match.imageUrl };

    // 4. Save recognition + increment trending counter atomically
    const recognition = await prisma.$transaction(async (tx) => {
      const created = await tx.recognition.create({
        data: {
          userId: userId ?? null,
          reciterId: reciter.id,
          confidenceScore: match.similarity,
          audioDuration: audioDuration ?? null,
          deviceOs: deviceOs ?? null,
        },
        select: { id: true },
      });

      await tx.reciter.update({
        where: { id: reciter.id },
        data: { totalDiscoveries: { increment: 1 } },
      });

      return created;
    });

    // 5. Return enriched result including the saved recognition ID
    return {
      isMatch: true,
      confidence: match.similarity,
      message: "Reciter identified successfully",
      recognitionId: recognition.id,
      reciter: {
        id: reciter.id,
        name: match.name,
        slug: reciter.slug,
        imageUrl: reciter.imageUrl,
      },
    };
  },

  // ---------------------------------------------------------------------------
  // User's personal discovery history — paginated
  // ---------------------------------------------------------------------------
  async getUserHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: RecognitionHistoryItem[]; pagination: object }> {
    const skip = (page - 1) * limit;

    const [recognitions, total] = await Promise.all([
      prisma.recognition.findMany({
        where: { userId },
        select: recognitionSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.recognition.count({ where: { userId } }),
    ]);

    return {
      data: recognitions as RecognitionHistoryItem[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // ---------------------------------------------------------------------------
  // Delete a recognition from history
  // User can only delete their own; admin can delete any.
  // Also decrements totalDiscoveries to keep the trending counter accurate.
  // ---------------------------------------------------------------------------
  async deleteRecognition(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<void> {
    const recognition = await prisma.recognition.findUnique({ where: { id } });

    if (!recognition) {
      throw new AppError("Recognition not found", StatusCodes.NOT_FOUND);
    }

    if (!isAdmin && recognition.userId !== userId) {
      throw new AppError(
        "You can only delete your own recognitions",
        StatusCodes.FORBIDDEN,
      );
    }

    await prisma.$transaction([
      prisma.recognition.delete({ where: { id } }),
      // Keep the trending counter in sync
      prisma.reciter.update({
        where: { id: recognition.reciterId },
        data: { totalDiscoveries: { decrement: 1 } },
      }),
    ]);
  },

  // ---------------------------------------------------------------------------
  // Admin analytics — all recognitions with optional filters
  // ---------------------------------------------------------------------------
  async getAllRecognitions(filters: {
    page: number;
    limit: number;
    reciterId?: string;
    userId?: string;
  }): Promise<{ data: AdminRecognitionItem[]; pagination: object }> {
    const { page, limit, reciterId, userId } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(reciterId && { reciterId }),
      ...(userId && { userId }),
    };

    const [recognitions, total] = await Promise.all([
      prisma.recognition.findMany({
        where,
        select: {
          ...recognitionSelect,
          user: {
            select: { id: true, displayName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.recognition.count({ where }),
    ]);

    return {
      data: recognitions as AdminRecognitionItem[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
