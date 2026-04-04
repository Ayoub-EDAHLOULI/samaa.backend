import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { predictReciterFromAudio } from "../../shared/utils/axios-ai-client";
import {
  ProcessAudioOptions,
  RecognitionResultResponse,
  RecognitionHistoryItem,
  AdminRecognitionItem,
} from "./recognitions.types";

// Minimum AI confidence required to accept a prediction
const CONFIDENCE_THRESHOLD = 0.6;

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

    // 1. Forward audio buffer to the Python microservice
    const aiResponse = await predictReciterFromAudio(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // 2. Confidence gate — unclear audio returns 200 with isMatch: false
    if (aiResponse.confidence < CONFIDENCE_THRESHOLD) {
      return {
        isMatch: false,
        confidence: aiResponse.confidence,
        message:
          "Audio not clear enough. Please try getting closer to the source.",
      };
    }

    // 3. Resolve predicted name against our DB (case-insensitive)
    const reciter = await prisma.reciter.findFirst({
      where: { name: { equals: aiResponse.reciter, mode: "insensitive" } },
    });

    if (!reciter) {
      return {
        isMatch: false,
        confidence: aiResponse.confidence,
        message: `Matched with "${aiResponse.reciter}", but their profile is not yet in our database.`,
      };
    }

    // 4. Save recognition + increment trending counter atomically
    const recognition = await prisma.$transaction(async (tx) => {
      const created = await tx.recognition.create({
        data: {
          userId: userId ?? null,
          reciterId: reciter.id,
          confidenceScore: aiResponse.confidence,
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
      confidence: aiResponse.confidence,
      message: "Reciter identified successfully",
      recognitionId: recognition.id,
      reciter: {
        id: reciter.id,
        name: reciter.name,
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
