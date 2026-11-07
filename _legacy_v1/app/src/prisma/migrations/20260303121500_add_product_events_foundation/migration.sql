-- Phase 0: product analytics event foundation
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" VARCHAR(64),
    "eventName" VARCHAR(80) NOT NULL,
    "eventVersion" VARCHAR(16) NOT NULL DEFAULT '1.0',
    "surface" VARCHAR(40),
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductEvent_eventName_createdAt_idx" ON "ProductEvent"("eventName", "createdAt");
CREATE INDEX "ProductEvent_userId_createdAt_idx" ON "ProductEvent"("userId", "createdAt");
CREATE INDEX "ProductEvent_surface_createdAt_idx" ON "ProductEvent"("surface", "createdAt");

ALTER TABLE "ProductEvent"
ADD CONSTRAINT "ProductEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
