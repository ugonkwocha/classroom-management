-- Add lightweight waitlist claim fields for coordinated assignment work.
ALTER TABLE "ProgramEnrollment"
ADD COLUMN "claimedById" TEXT,
ADD COLUMN "claimExpiresAt" TIMESTAMP(3);

CREATE INDEX "ProgramEnrollment_claimedById_idx" ON "ProgramEnrollment"("claimedById");
CREATE INDEX "ProgramEnrollment_claimExpiresAt_idx" ON "ProgramEnrollment"("claimExpiresAt");

ALTER TABLE "ProgramEnrollment"
ADD CONSTRAINT "ProgramEnrollment_claimedById_fkey"
FOREIGN KEY ("claimedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
