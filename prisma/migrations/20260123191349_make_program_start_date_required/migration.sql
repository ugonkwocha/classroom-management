/*
  Warnings:

  - Made the column `startDate` on table `Program` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
-- First, set a default date for any existing NULL values
UPDATE "Program" SET "startDate" = CURRENT_DATE WHERE "startDate" IS NULL;

-- Then make the column required
ALTER TABLE "Program" ALTER COLUMN "startDate" SET NOT NULL;
