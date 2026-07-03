-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "profile" JSONB;

-- CreateTable
CREATE TABLE "Progress" (
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("userId","personId","suggestionId")
);

-- CreateIndex
CREATE INDEX "Progress_userId_personId_idx" ON "Progress"("userId", "personId");

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
