-- Allow siblings to share the same parent contact details.
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_parentEmail_key";
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_parentPhone_key";
DROP INDEX IF EXISTS "Student_parentEmail_key";
DROP INDEX IF EXISTS "Student_parentPhone_key";
