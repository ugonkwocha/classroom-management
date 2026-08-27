ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PARENT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TUTOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STUDENT';

CREATE TABLE "Role" (
  "slug" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("slug")
);

INSERT INTO "Role" ("slug", "label", "description") VALUES
  ('superadmin', 'Super Admin', 'Full system owner with access to all academy operations.'),
  ('admin', 'Admin', 'Operational administrator with broad academy access.'),
  ('staff', 'Staff', 'Internal academy staff member.'),
  ('parent', 'Parent', 'Parent or guardian with access to linked family records.'),
  ('tutor', 'Tutor', 'Tutor with access to assigned classes and students.'),
  ('student', 'Student', 'Learner with access to their own learning records.')
ON CONFLICT ("slug") DO NOTHING;

CREATE TABLE "UserRoleAssignment" (
  "userId" TEXT NOT NULL,
  "roleSlug" TEXT NOT NULL,
  "grantedById" TEXT,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("userId", "roleSlug")
);

CREATE INDEX "UserRoleAssignment_roleSlug_idx" ON "UserRoleAssignment"("roleSlug");
CREATE INDEX "UserRoleAssignment_grantedById_idx" ON "UserRoleAssignment"("grantedById");

ALTER TABLE "UserRoleAssignment"
  ADD CONSTRAINT "UserRoleAssignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRoleAssignment"
  ADD CONSTRAINT "UserRoleAssignment_roleSlug_fkey"
  FOREIGN KEY ("roleSlug") REFERENCES "Role"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserRoleAssignment"
  ADD CONSTRAINT "UserRoleAssignment_grantedById_fkey"
  FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "UserRoleAssignment" ("userId", "roleSlug", "grantedById", "grantedAt")
SELECT "id", LOWER("role"::text), NULL, CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("userId", "roleSlug") DO NOTHING;

ALTER TABLE "Teacher" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");
ALTER TABLE "Teacher"
  ADD CONSTRAINT "Teacher_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ParentGuardian" ADD COLUMN "userId" TEXT;
CREATE INDEX "ParentGuardian_userId_idx" ON "ParentGuardian"("userId");
ALTER TABLE "ParentGuardian"
  ADD CONSTRAINT "ParentGuardian_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
