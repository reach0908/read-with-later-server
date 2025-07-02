-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScraperType" AS ENUM ('LIGHTWEIGHT', 'HEAVYWEIGHT');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "author" TEXT,
    "excerpt" TEXT,
    "content" TEXT,
    "textContent" TEXT,
    "thumbnailUrl" TEXT,
    "failureReason" TEXT,
    "scrapedWith" "ScraperType",

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_sourceUrl_key" ON "Article"("sourceUrl");
