/*
  Warnings:

  - You are about to drop the column `biography` on the `reciters` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `reciters` table. All the data in the column will be lost.
  - You are about to drop the column `nationality` on the `reciters` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "reciters" DROP COLUMN "biography",
DROP COLUMN "name",
DROP COLUMN "nationality",
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "style" TEXT;

-- CreateTable
CREATE TABLE "Language" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reciter_translations" (
    "id" TEXT NOT NULL,
    "reciterId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT,
    "shortBio" TEXT,
    "biography" TEXT,
    "seoTitle" TEXT,
    "tags" TEXT,

    CONSTRAINT "reciter_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");

-- CreateIndex
CREATE INDEX "reciter_translations_language_idx" ON "reciter_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "reciter_translations_reciterId_language_key" ON "reciter_translations"("reciterId", "language");

-- AddForeignKey
ALTER TABLE "reciter_translations" ADD CONSTRAINT "reciter_translations_reciterId_fkey" FOREIGN KEY ("reciterId") REFERENCES "reciters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
