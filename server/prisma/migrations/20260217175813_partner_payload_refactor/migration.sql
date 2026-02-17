/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `LoanApplication` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "firstNameNonLatin" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "kycData" JSONB,
ADD COLUMN     "lastNameNonLatin" TEXT;

-- AlterTable
ALTER TABLE "LoanApplication" ADD COLUMN     "applicationData" JSONB,
ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LoanApplication_externalId_key" ON "LoanApplication"("externalId");
