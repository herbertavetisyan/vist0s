/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,productId]` on the table `LoanType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productId` to the `LoanType` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApplicantType" AS ENUM ('PERSON', 'LEGAL_ENTITY', 'IE');

-- CreateEnum
CREATE TYPE "ApplicantRole" AS ENUM ('APPLICANT', 'CO_APPLICANT', 'GUARANTOR', 'PLEDGER');

-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "previousId" TEXT,
ADD COLUMN     "role" "ApplicantRole" NOT NULL DEFAULT 'APPLICANT',
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "type" "ApplicantType" NOT NULL DEFAULT 'PERSON',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "armsoftTemplate" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "contractGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finalCalculatedAmount" DOUBLE PRECISION,
ADD COLUMN     "kycData" JSONB,
ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "repaymentSchedule" JSONB,
ADD COLUMN     "serviceFee" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LoanType" ADD COLUMN     "allowedApplicantTypes" "ApplicantType"[],
ADD COLUMN     "allowedRoles" "ApplicantRole"[],
ADD COLUMN     "isPartnerOriginated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "productId" TEXT NOT NULL,
ADD COLUMN     "requiredDocuments" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_tenantId_key_key" ON "SystemSetting"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "LoanType_tenantId_productId_key" ON "LoanType"("tenantId", "productId");

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
