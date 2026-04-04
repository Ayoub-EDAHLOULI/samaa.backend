import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { predictReciterFromAudio } from "../../shared/utils/axios-ai-client";
import {
  RecognitionResultResponse,
  RecognitionHistoryResponse,
} from "./recognitions.types";

// The minimum confidence required to accept a prediction from the AI
const CONFIDENCE_THRESHOLD = 0.6;

export const recognitionsService = {
  async processAudio(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<RecognitionResultResponse> {
    // 1. Send the RAM buffer to the Python Microservice
    const aiResponse = await predictReciterFromAudio(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // 2. Evaluate Confidence
    if (aiResponse.confidence < CONFIDENCE_THRESHOLD) {
      // Return a 200 OK, but with isMatch: false.
      // This isn't a server error, it's just unclear audio.
      return {
        isMatch: false,
        confidence: aiResponse.confidence,
        message:
          "Audio not clear enough. Please try getting closer to the source.",
      };
    }

    // 3. Look up the predicted reciter in our database
    const reciter = await prisma.reciter.findFirst({
      where: {
        // Case-insensitive search to ensure "Omar Al Darweez" matches "omar al darweez"
        name: { equals: aiResponse.reciter, mode: "insensitive" },
      },
    });

    if (!reciter) {
      // The AI predicted a name that doesn't exist in our PostgreSQL DB yet
      return {
        isMatch: false,
        confidence: aiResponse.confidence,
        message: `Matched with ${aiResponse.reciter}, but their profile is not yet in our database.`,
      };
    }

    // 4. Save the Recognition & Update Trending Stats in a Transaction
    // Transactions ensure that if one fails, both fail, keeping data accurate.
    await prisma.$transaction(async (tx) => {
      // Log the discovery
      await tx.recognition.create({
        data: {
          userId: userId || null,
          reciterId: reciter.id,
          confidenceScore: aiResponse.confidence,
          // Optional: Calculate duration from file size/bitrate, or let the mobile app pass it in the body
        },
      });

      // Increment the Qari's global trending score
      await tx.reciter.update({
        where: { id: reciter.id },
        data: { totalDiscoveries: { increment: 1 } },
      });
    });

    // 5. Return the successful match to the user
    return {
      isMatch: true,
      confidence: aiResponse.confidence,
      message: "Reciter identified successfully",
      reciter: {
        id: reciter.id,
        name: reciter.name,
        slug: reciter.slug,
        imageUrl: reciter.imageUrl,
      },
    };
  },

  async getUserHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [recognitions, total] = await Promise.all([
      prisma.recognition.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          confidenceScore: true,
          audioDuration: true,
          createdAt: true,
          reciter: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
            },
          },
        },
      }),
      prisma.recognition.count({ where: { userId } }),
    ]);

    return {
      data: recognitions as RecognitionHistoryResponse[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
