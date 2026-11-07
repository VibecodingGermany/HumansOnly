-- CreateTable
CREATE TABLE "AuthenticityAppeal" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "reason" VARCHAR(500),
    "decision" VARCHAR(20),
    "reviewerId" TEXT,
    "reviewerNote" VARCHAR(500),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthenticityAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthenticityAppeal_checkId_actorId_key" ON "AuthenticityAppeal"("checkId", "actorId");

-- CreateIndex
CREATE INDEX "AuthenticityAppeal_status_createdAt_idx" ON "AuthenticityAppeal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuthenticityAppeal_actorId_createdAt_idx" ON "AuthenticityAppeal"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthenticityAppeal" ADD CONSTRAINT "AuthenticityAppeal_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "AuthenticityCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthenticityAppeal" ADD CONSTRAINT "AuthenticityAppeal_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthenticityAppeal" ADD CONSTRAINT "AuthenticityAppeal_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
