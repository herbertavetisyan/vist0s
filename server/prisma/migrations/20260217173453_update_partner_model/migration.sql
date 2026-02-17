/*
  Warnings:

  - A unique constraint covering the columns `[appId]` on the table `Partner` will be added. If there are existing duplicate values, this will fail.
  - The required column `appId` was added to the `Partner` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `Partner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "appId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'AGENT';

-- CreateIndex
CREATE UNIQUE INDEX "Partner_appId_key" ON "Partner"("appId");
