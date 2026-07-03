-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ageConfirmed18Plus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'inactive';
