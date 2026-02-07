-- CreateEnum for PriceType
CREATE TYPE "PriceType" AS ENUM ('FULL_PRICE', 'SIBLING_DISCOUNT', 'EARLY_BIRD');

-- Add priceType and priceAmount columns to ProgramEnrollment
ALTER TABLE "ProgramEnrollment" ADD COLUMN "priceType" "PriceType" NOT NULL DEFAULT 'FULL_PRICE';
ALTER TABLE "ProgramEnrollment" ADD COLUMN "priceAmount" INTEGER NOT NULL DEFAULT 60000;

-- Create PricingConfig table
CREATE TABLE "PricingConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "priceType" "PriceType" NOT NULL UNIQUE,
  "amount" INTEGER NOT NULL,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create index on priceType
CREATE INDEX "PricingConfig_priceType_idx" ON "PricingConfig"("priceType");
