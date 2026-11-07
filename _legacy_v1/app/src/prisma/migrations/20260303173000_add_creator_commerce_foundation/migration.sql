-- Wave 8: creator commerce foundation
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageName" VARCHAR(60),
    "bio" VARCHAR(500),
    "primaryDiscipline" VARCHAR(30),
    "genres" JSONB,
    "supportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shopEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tipMinCents" INTEGER NOT NULL DEFAULT 200,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'EUR',
    "payoutProvider" VARCHAR(20) NOT NULL DEFAULT 'none',
    "payoutStatus" VARCHAR(20) NOT NULL DEFAULT 'not_connected',
    "payoutAccountId" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorPortfolioItem" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "mediaType" VARCHAR(20) NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "previewUrl" TEXT,
    "thumbnailUrl" TEXT,
    "priceCents" INTEGER,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'EUR',
    "licensingType" VARCHAR(20) NOT NULL DEFAULT 'personal',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPortfolioItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorTip" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "senderId" TEXT,
    "itemId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'EUR',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "provider" VARCHAR(20) NOT NULL DEFAULT 'manual',
    "providerReference" VARCHAR(160),
    "message" VARCHAR(160),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorTip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorProfile_userId_key"
ON "CreatorProfile"("userId");

CREATE INDEX "CreatorProfile_supportEnabled_createdAt_idx"
ON "CreatorProfile"("supportEnabled", "createdAt");

CREATE INDEX "CreatorProfile_shopEnabled_createdAt_idx"
ON "CreatorProfile"("shopEnabled", "createdAt");

CREATE INDEX "CreatorPortfolioItem_creatorProfileId_isPublished_createdAt_idx"
ON "CreatorPortfolioItem"("creatorProfileId", "isPublished", "createdAt");

CREATE INDEX "CreatorPortfolioItem_ownerId_createdAt_idx"
ON "CreatorPortfolioItem"("ownerId", "createdAt");

CREATE INDEX "CreatorTip_creatorProfileId_createdAt_idx"
ON "CreatorTip"("creatorProfileId", "createdAt");

CREATE INDEX "CreatorTip_senderId_createdAt_idx"
ON "CreatorTip"("senderId", "createdAt");

CREATE INDEX "CreatorTip_status_createdAt_idx"
ON "CreatorTip"("status", "createdAt");

ALTER TABLE "CreatorProfile"
ADD CONSTRAINT "CreatorProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorPortfolioItem"
ADD CONSTRAINT "CreatorPortfolioItem_creatorProfileId_fkey"
FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorPortfolioItem"
ADD CONSTRAINT "CreatorPortfolioItem_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorTip"
ADD CONSTRAINT "CreatorTip_creatorProfileId_fkey"
FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorTip"
ADD CONSTRAINT "CreatorTip_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreatorTip"
ADD CONSTRAINT "CreatorTip_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "CreatorPortfolioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
