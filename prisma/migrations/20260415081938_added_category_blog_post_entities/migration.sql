/*
  Warnings:

  - You are about to drop the `Language` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Language";

-- CreateTable
CREATE TABLE "languages" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_categories" (
    "id" SERIAL NOT NULL,
    "handle" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_category_translations" (
    "id" TEXT NOT NULL,
    "blogCategoryId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" SERIAL NOT NULL,
    "handle" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "readTimeMinutes" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_translations" (
    "id" TEXT NOT NULL,
    "blogPostId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_post_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_handle_key" ON "blog_categories"("handle");

-- CreateIndex
CREATE INDEX "blog_category_translations_blogCategoryId_idx" ON "blog_category_translations"("blogCategoryId");

-- CreateIndex
CREATE INDEX "blog_category_translations_languageCode_idx" ON "blog_category_translations"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "blog_category_translations_blogCategoryId_languageCode_key" ON "blog_category_translations"("blogCategoryId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_handle_key" ON "blog_posts"("handle");

-- CreateIndex
CREATE INDEX "blog_posts_categoryId_idx" ON "blog_posts"("categoryId");

-- CreateIndex
CREATE INDEX "blog_posts_authorId_idx" ON "blog_posts"("authorId");

-- CreateIndex
CREATE INDEX "blog_post_translations_blogPostId_idx" ON "blog_post_translations"("blogPostId");

-- CreateIndex
CREATE INDEX "blog_post_translations_languageCode_idx" ON "blog_post_translations"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_translations_blogPostId_languageCode_key" ON "blog_post_translations"("blogPostId", "languageCode");

-- AddForeignKey
ALTER TABLE "blog_category_translations" ADD CONSTRAINT "blog_category_translations_blogCategoryId_fkey" FOREIGN KEY ("blogCategoryId") REFERENCES "blog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_category_translations" ADD CONSTRAINT "blog_category_translations_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "languages"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "blog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_translations" ADD CONSTRAINT "blog_post_translations_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_translations" ADD CONSTRAINT "blog_post_translations_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "languages"("code") ON DELETE CASCADE ON UPDATE CASCADE;
