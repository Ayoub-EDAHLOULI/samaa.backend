import axios from "axios";
import FormData from "form-data";
import { AppError } from "./errors";
import { StatusCodes } from "../constants/status-codes";

// This module acts as a proxy between our Node.js backend and the Python FastAPI microservice that handles AI predictions.
export interface AiEmbeddingResponse {
  embedding: number[]; // 192-dim ECAPA-TDNN speaker embedding, L2-normalized
}

/**
 * Forwards an audio buffer to the internal Python FastAPI microservice
 * and returns the raw voice embedding. Matching against known reciters
 * now happens in Postgres via pgvector, not in Python.
 */
export async function extractEmbeddingFromAudio(
  audioBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
): Promise<AiEmbeddingResponse> {
  try {
    // The URL of the Python microservice is configurable via environment variable for flexibility (e.g., different URLs for development vs production)
    const aiServiceUrl =
      process.env.AI_MICROSERVICE_URL || "http://127.0.0.1:8000/predict";

    // 1. Construct the multipart/form-data payload for Python
    const form = new FormData();
    form.append("audio", audioBuffer, {
      filename: originalFilename,
      contentType: mimeType,
    });

    // 2. Fire the request to the Python server
    const response = await axios.post<AiEmbeddingResponse>(
      aiServiceUrl,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        // Timeout after 35 seconds (AI audio processing can take a moment)
        timeout: 35000,
      },
    );

    // 3. Return the parsed JSON
    return response.data;
  } catch (error: any) {
    console.error("🐍 Python API Proxy Error:", error.message);

    // If the Python server is offline or crashes
    if (error.code === "ECONNREFUSED") {
      throw new AppError(
        "The AI Recognition Engine is currently offline. Please try again in a moment.",
        StatusCodes.SERVICE_UNAVAILABLE,
      );
    }

    throw new AppError(
      "Failed to process the audio snippet. The recording might be corrupted.",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
}
