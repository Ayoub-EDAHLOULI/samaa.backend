-- Replace the single averaged voice print on reciters with a table holding
-- one embedding per enrollment recording (multi-enrollment speaker ID).

-- DropColumn
ALTER TABLE "reciters" DROP COLUMN "embedding";

-- CreateTable
CREATE TABLE "reciter_embeddings" (
    "id" TEXT NOT NULL,
    "reciterId" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "embedding" vector(192) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reciter_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reciter_embeddings_reciterId_idx" ON "reciter_embeddings"("reciterId");

-- AddForeignKey
ALTER TABLE "reciter_embeddings" ADD CONSTRAINT "reciter_embeddings_reciterId_fkey" FOREIGN KEY ("reciterId") REFERENCES "reciters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
