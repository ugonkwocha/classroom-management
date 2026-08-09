-- Price option codes were originally constrained to three enum values. Convert
-- the stored codes to text so superadmins can add catalog options without
-- rewriting historical enrollments or payment records.
ALTER TABLE "ProgramEnrollment" ALTER COLUMN "priceType" DROP DEFAULT;
ALTER TABLE "ProgramEnrollment" ALTER COLUMN "priceType" TYPE TEXT USING ("priceType"::text);
ALTER TABLE "ProgramEnrollment" ALTER COLUMN "priceType" SET DEFAULT 'FULL_PRICE';

ALTER TABLE "FluentFormMapping" ALTER COLUMN "defaultPriceType" DROP DEFAULT;
ALTER TABLE "FluentFormMapping" ALTER COLUMN "defaultPriceType" TYPE TEXT USING ("defaultPriceType"::text);
ALTER TABLE "FluentFormMapping" ALTER COLUMN "defaultPriceType" SET DEFAULT 'FULL_PRICE';

ALTER TABLE "ConfirmedRegistrationImportChild" ALTER COLUMN "priceType" DROP DEFAULT;
ALTER TABLE "ConfirmedRegistrationImportChild" ALTER COLUMN "priceType" TYPE TEXT USING ("priceType"::text);
ALTER TABLE "ConfirmedRegistrationImportChild" ALTER COLUMN "priceType" SET DEFAULT 'FULL_PRICE';

ALTER TABLE "PricingConfig" ALTER COLUMN "priceType" TYPE TEXT USING ("priceType"::text);

DROP TYPE "PriceType";

ALTER TABLE "PricingConfig"
  ADD COLUMN "label" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

INSERT INTO "PricingConfig" ("id", "priceType", "label", "description", "amount", "isActive", "isSystem", "displayOrder", "createdAt", "updatedAt")
VALUES
  ('pricing_full_price', 'FULL_PRICE', 'Full Price', 'Standard enrollment price', 60000, true, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pricing_sibling_discount', 'SIBLING_DISCOUNT', 'Sibling Discount', 'For siblings enrolled in the same program', 56000, true, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pricing_early_bird', 'EARLY_BIRD', 'Early Bird', 'Early registration discount', 54000, true, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("priceType") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "isActive" = true,
  "isSystem" = true,
  "displayOrder" = EXCLUDED."displayOrder";

ALTER TABLE "PricingConfig"
  ALTER COLUMN "label" SET NOT NULL,
  ALTER COLUMN "description" SET NOT NULL;

CREATE INDEX "PricingConfig_isActive_idx" ON "PricingConfig"("isActive");
CREATE INDEX "PricingConfig_displayOrder_idx" ON "PricingConfig"("displayOrder");
