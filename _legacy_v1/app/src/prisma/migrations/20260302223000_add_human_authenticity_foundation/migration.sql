-- AlterTable
ALTER TABLE "Tweet"
ADD COLUMN "visibilityStatus" VARCHAR(20) NOT NULL DEFAULT 'public',
ADD COLUMN "authenticityScore" DOUBLE PRECISION,
ADD COLUMN "authenticityDecision" VARCHAR(20);

-- AlterTable
ALTER TABLE "MediaAsset"
ADD COLUMN "provenanceStatus" VARCHAR(20) NOT NULL DEFAULT 'unknown',
ADD COLUMN "provenanceSigner" VARCHAR(160),
ADD COLUMN "provenanceDataJson" JSONB,
ADD COLUMN "syntheticRiskScore" DOUBLE PRECISION,
ADD COLUMN "authenticityDecision" VARCHAR(20);

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "locale" VARCHAR(12) NOT NULL DEFAULT 'en-US',
    "title" VARCHAR(160) NOT NULL,
    "sections" JSONB NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyDocumentId" TEXT NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" VARCHAR(64),
    "userAgentHash" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanChallengeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'verified',
    "challengeScore" DOUBLE PRECISION,
    "hostname" VARCHAR(160),
    "ruleVersion" VARCHAR(40),
    "errorCode" VARCHAR(120),
    "responseJson" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanChallengeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthenticityCheck" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "tweetId" TEXT,
    "mediaAssetId" TEXT,
    "challengeSessionId" TEXT,
    "action" VARCHAR(40) NOT NULL,
    "subjectType" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "decision" VARCHAR(20) NOT NULL DEFAULT 'allow',
    "score" DOUBLE PRECISION,
    "challengeScore" DOUBLE PRECISION,
    "trustedTier" VARCHAR(20),
    "ruleVersion" VARCHAR(40),
    "modelVersion" VARCHAR(40),
    "reasons" JSONB,
    "contentText" VARCHAR(280),
    "metadata" JSONB,
    "reviewerNote" VARCHAR(500),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthenticityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PolicyDocument_version_key" ON "PolicyDocument"("version");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcceptance_userId_policyDocumentId_key" ON "PolicyAcceptance"("userId", "policyDocumentId");

-- CreateIndex
CREATE INDEX "PolicyAcceptance_userId_acceptedAt_idx" ON "PolicyAcceptance"("userId", "acceptedAt");

-- CreateIndex
CREATE INDEX "HumanChallengeSession_userId_action_status_expiresAt_idx" ON "HumanChallengeSession"("userId", "action", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "HumanChallengeSession_tokenHash_idx" ON "HumanChallengeSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthenticityCheck_status_createdAt_idx" ON "AuthenticityCheck"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuthenticityCheck_actorId_createdAt_idx" ON "AuthenticityCheck"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthenticityCheck_decision_score_idx" ON "AuthenticityCheck"("decision", "score");

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_policyDocumentId_fkey" FOREIGN KEY ("policyDocumentId") REFERENCES "PolicyDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanChallengeSession" ADD CONSTRAINT "HumanChallengeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthenticityCheck" ADD CONSTRAINT "AuthenticityCheck_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthenticityCheck" ADD CONSTRAINT "AuthenticityCheck_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthenticityCheck" ADD CONSTRAINT "AuthenticityCheck_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthenticityCheck" ADD CONSTRAINT "AuthenticityCheck_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthenticityCheck" ADD CONSTRAINT "AuthenticityCheck_challengeSessionId_fkey" FOREIGN KEY ("challengeSessionId") REFERENCES "HumanChallengeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
