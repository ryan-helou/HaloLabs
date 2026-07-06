-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('TEASER', 'FULL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "attribution" JSONB;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "shareToken" TEXT,
ADD COLUMN     "shareKind" TEXT;

-- AlterTable
ALTER TABLE "AnalysisJob" ADD COLUMN     "jobType" "JobType" NOT NULL DEFAULT 'TEASER',
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leaseUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT,
    "attribution" JSONB,
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_shareToken_key" ON "Person"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "Conversion_stripeSessionId_key" ON "Conversion"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Conversion_userId_idx" ON "Conversion"("userId");

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
