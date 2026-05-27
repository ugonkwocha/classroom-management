-- Add first-class family and parent/guardian records while keeping legacy
-- student parent fields in place during the transition.
CREATE TYPE "GuardianRelationship" AS ENUM ('PARENT', 'MOTHER', 'FATHER', 'GUARDIAN', 'OTHER');

CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParentGuardian" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "emailNormalized" TEXT,
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "phoneCountryCode" TEXT,
    "relationship" "GuardianRelationship" NOT NULL DEFAULT 'PARENT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentGuardian_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Student" ADD COLUMN "familyId" TEXT;

CREATE INDEX "Family_displayName_idx" ON "Family"("displayName");
CREATE INDEX "Family_isArchived_idx" ON "Family"("isArchived");
CREATE INDEX "ParentGuardian_familyId_idx" ON "ParentGuardian"("familyId");
CREATE INDEX "ParentGuardian_emailNormalized_idx" ON "ParentGuardian"("emailNormalized");
CREATE INDEX "ParentGuardian_phoneNormalized_phoneCountryCode_idx" ON "ParentGuardian"("phoneNormalized", "phoneCountryCode");
CREATE INDEX "ParentGuardian_isPrimary_idx" ON "ParentGuardian"("isPrimary");
CREATE INDEX "ParentGuardian_isActive_idx" ON "ParentGuardian"("isActive");
CREATE INDEX "ParentGuardian_needsReview_idx" ON "ParentGuardian"("needsReview");
CREATE INDEX "Student_familyId_idx" ON "Student"("familyId");

ALTER TABLE "ParentGuardian" ADD CONSTRAINT "ParentGuardian_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;
