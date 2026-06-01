-- Add course-specific preparation email templates.
ALTER TYPE "EmailEventType" ADD VALUE IF NOT EXISTS 'PREPARATION_INSTRUCTIONS';

CREATE TABLE "CourseEmailTemplate" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseEmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseEmailTemplate_courseId_key" ON "CourseEmailTemplate"("courseId");
CREATE INDEX "CourseEmailTemplate_isActive_idx" ON "CourseEmailTemplate"("isActive");
CREATE INDEX "CourseEmailTemplate_updatedById_idx" ON "CourseEmailTemplate"("updatedById");

ALTER TABLE "CourseEmailTemplate"
ADD CONSTRAINT "CourseEmailTemplate_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
