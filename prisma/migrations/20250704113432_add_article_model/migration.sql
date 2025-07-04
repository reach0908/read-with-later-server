-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "contentType" TEXT,
    "summary" TEXT,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "wordCount" INTEGER,
    "readingTime" INTEGER,
    "tags" TEXT[],
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Article_userId_idx" ON "Article"("userId");

-- CreateIndex
CREATE INDEX "Article_userId_isBookmarked_idx" ON "Article"("userId", "isBookmarked");

-- CreateIndex
CREATE INDEX "Article_userId_isArchived_idx" ON "Article"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "Article_createdAt_idx" ON "Article"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Article_url_userId_key" ON "Article"("url", "userId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
