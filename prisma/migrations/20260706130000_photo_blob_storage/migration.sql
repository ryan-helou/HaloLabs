-- CreateTable
CREATE TABLE "PhotoBlob" (
    "key" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoBlob_pkey" PRIMARY KEY ("key")
);
