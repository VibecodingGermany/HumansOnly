-- Add optional Clerk identity to map Clerk users to local app users
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;

CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
