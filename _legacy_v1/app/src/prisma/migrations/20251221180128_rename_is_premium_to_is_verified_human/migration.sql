/*
  Warnings:

  - You are about to drop the column `isPremium` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "isPremium",
ADD COLUMN     "isVerifiedHuman" BOOLEAN NOT NULL DEFAULT false;
