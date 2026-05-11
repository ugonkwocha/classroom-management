-- Add authentication tables that existed in the Prisma schema but were missing from migrations.
-- Use idempotent statements so databases previously updated with `prisma db push` can still deploy.
DO $$
BEGIN
  CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'STAFF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'STAFF',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "phoneCountryCode" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "parentPhoneCountryCode" TEXT;

CREATE INDEX IF NOT EXISTS "Student_phone_idx" ON "Student"("phone");
CREATE INDEX IF NOT EXISTS "Student_parentEmail_idx" ON "Student"("parentEmail");
CREATE INDEX IF NOT EXISTS "Student_parentPhone_idx" ON "Student"("parentPhone");
