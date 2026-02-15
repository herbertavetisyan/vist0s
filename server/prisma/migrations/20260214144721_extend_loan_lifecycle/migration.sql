/*
  Warnings:

  - The values [IN_REVIEW] on the enum `ApplicationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `amount` on the `LoanApplication` table. All the data in the column will be lost.
  - You are about to drop the column `termMonths` on the `LoanApplication` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[enrichmentRequestId]` on the table `LoanApplication` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amountRequested` to the `LoanApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `termRequested` to the `LoanApplication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'ENRICHING', 'OFFER_READY', 'OFFER_SELECTED', 'SIGNING', 'SIGNING_COMPLETE', 'OTP_VERIFIED', 'APPROVED', 'REJECTED', 'DISBURSED');
ALTER TABLE "LoanApplication" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LoanApplication" ALTER COLUMN "status" TYPE "ApplicationStatus_new" USING ("status"::text::"ApplicationStatus_new");
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "ApplicationStatus_old";
ALTER TABLE "LoanApplication" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "LoanApplication" DROP COLUMN "amount",
DROP COLUMN "termMonths",
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "amountRequested" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "approvedLimit" DECIMAL(65,30),
ADD COLUMN     "approvedTerm" INTEGER,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "enrichmentRequestId" INTEGER,
ADD COLUMN     "interestRate" DECIMAL(65,30),
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "otpHash" TEXT,
ADD COLUMN     "selectedAmount" DECIMAL(65,30),
ADD COLUMN     "selectedTerm" INTEGER,
ADD COLUMN     "termRequested" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LoanApplication_enrichmentRequestId_key" ON "LoanApplication"("enrichmentRequestId");

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_enrichmentRequestId_fkey" FOREIGN KEY ("enrichmentRequestId") REFERENCES "EnrichmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
