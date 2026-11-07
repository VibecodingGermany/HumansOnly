-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "storageKey" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "uploadType" VARCHAR(20) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "compressedSize" INTEGER NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "moderationStatus" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "moderationReason" VARCHAR(160),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAsset_ownerId_createdAt_idx" ON "MediaAsset"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_checksum_idx" ON "MediaAsset"("checksum");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
