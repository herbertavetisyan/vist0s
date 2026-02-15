-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "EnrichmentRequest" (
    "id" SERIAL NOT NULL,
    "nationalId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "EnrichmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrichmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrichmentResult" (
    "id" SERIAL NOT NULL,
    "enrichmentRequestId" INTEGER NOT NULL,
    "serviceName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "responseData" JSONB,
    "errorMessage" TEXT,
    "sequenceOrder" INTEGER NOT NULL,

    CONSTRAINT "EnrichmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrichmentResult_enrichmentRequestId_idx" ON "EnrichmentResult"("enrichmentRequestId");

-- CreateIndex
CREATE INDEX "EnrichmentResult_serviceName_idx" ON "EnrichmentResult"("serviceName");

-- AddForeignKey
ALTER TABLE "EnrichmentResult" ADD CONSTRAINT "EnrichmentResult_enrichmentRequestId_fkey" FOREIGN KEY ("enrichmentRequestId") REFERENCES "EnrichmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
