-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "ScrapedPage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "status" "ScrapeStatus" NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapedPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "ScrapeStatus" NOT NULL,
    "errorMsg" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedPage_userId_url_key" ON "ScrapedPage"("userId", "url");

-- AddForeignKey
ALTER TABLE "ScrapedPage" ADD CONSTRAINT "ScrapedPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeHistory" ADD CONSTRAINT "ScrapeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
