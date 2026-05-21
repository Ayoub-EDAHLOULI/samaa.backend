-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "reciters" ADD COLUMN     "embedding" vector(192);
