-- Phase 1: recommendation feedback storage
CREATE TABLE "RecommendationFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tweetId" TEXT NOT NULL,
    "feedbackType" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecommendationFeedback_userId_tweetId_feedbackType_key"
ON "RecommendationFeedback"("userId", "tweetId", "feedbackType");

CREATE INDEX "RecommendationFeedback_userId_feedbackType_createdAt_idx"
ON "RecommendationFeedback"("userId", "feedbackType", "createdAt");

CREATE INDEX "RecommendationFeedback_tweetId_feedbackType_idx"
ON "RecommendationFeedback"("tweetId", "feedbackType");

ALTER TABLE "RecommendationFeedback"
ADD CONSTRAINT "RecommendationFeedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecommendationFeedback"
ADD CONSTRAINT "RecommendationFeedback_tweetId_fkey"
FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
