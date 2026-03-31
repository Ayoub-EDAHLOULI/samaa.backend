import app from "./app";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

async function startServer() {
  try {
    // 1. Test Database Connection
    await prisma.$connect();
    console.log("📦 Successfully connected to the PostgreSQL database");

    // 2. Start Express Server
    app.listen(PORT, () => {
      console.log(
        `🚀 Samaa (سماع) Backend is running on http://localhost:${PORT}`,
      );
    });
  } catch (error) {
    console.error("❌ Failed to start the server:", error);
    process.exit(1);
  }
}

startServer();

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
const shutdown = async () => {
  console.log("⚠️ Shutting down Samaa server...");
  await prisma.$disconnect();
  console.log("💤 Database connection closed.");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
