/*
  Warnings:

  - You are about to drop the column `textContent` on the `Article` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Article" DROP COLUMN "textContent",
ADD COLUMN     "htmlContent" TEXT;
