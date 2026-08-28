CREATE TYPE "ClassSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
CREATE TYPE "StudentProgressRating" AS ENUM ('EXCEEDING', 'ON_TRACK', 'NEEDS_SUPPORT');

ALTER TABLE "UserInvitation" ADD COLUMN "targetTeacherId" TEXT;

CREATE TABLE "ClassSession" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "recordedById" TEXT NOT NULL,
  "heldAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "topics" TEXT NOT NULL,
  "summary" TEXT,
  "homework" TEXT,
  "status" "ClassSessionStatus" NOT NULL DEFAULT 'COMPLETED',
  "parentVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceRecord" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "AttendanceStatus" NOT NULL,
  "notes" TEXT,
  "markedById" TEXT NOT NULL,
  "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentProgressUpdate" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "rating" "StudentProgressRating" NOT NULL,
  "summary" TEXT NOT NULL,
  "strengths" TEXT,
  "focusAreas" TEXT,
  "parentVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentProgressUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserInvitation_targetTeacherId_idx" ON "UserInvitation"("targetTeacherId");
CREATE UNIQUE INDEX "ClassSession_classId_heldAt_key" ON "ClassSession"("classId", "heldAt");
CREATE INDEX "ClassSession_classId_heldAt_idx" ON "ClassSession"("classId", "heldAt");
CREATE INDEX "ClassSession_recordedById_idx" ON "ClassSession"("recordedById");
CREATE INDEX "ClassSession_status_idx" ON "ClassSession"("status");
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId", "studentId");
CREATE INDEX "AttendanceRecord_studentId_markedAt_idx" ON "AttendanceRecord"("studentId", "markedAt");
CREATE INDEX "AttendanceRecord_markedById_idx" ON "AttendanceRecord"("markedById");
CREATE INDEX "AttendanceRecord_status_idx" ON "AttendanceRecord"("status");
CREATE UNIQUE INDEX "StudentProgressUpdate_sessionId_studentId_key" ON "StudentProgressUpdate"("sessionId", "studentId");
CREATE INDEX "StudentProgressUpdate_classId_studentId_createdAt_idx" ON "StudentProgressUpdate"("classId", "studentId", "createdAt");
CREATE INDEX "StudentProgressUpdate_authorId_idx" ON "StudentProgressUpdate"("authorId");
CREATE INDEX "StudentProgressUpdate_parentVisible_idx" ON "StudentProgressUpdate"("parentVisible");

ALTER TABLE "UserInvitation"
  ADD CONSTRAINT "UserInvitation_targetTeacherId_fkey"
  FOREIGN KEY ("targetTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClassSession"
  ADD CONSTRAINT "ClassSession_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSession"
  ADD CONSTRAINT "ClassSession_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AttendanceRecord"
  ADD CONSTRAINT "AttendanceRecord_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord"
  ADD CONSTRAINT "AttendanceRecord_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord"
  ADD CONSTRAINT "AttendanceRecord_markedById_fkey"
  FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentProgressUpdate"
  ADD CONSTRAINT "StudentProgressUpdate_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProgressUpdate"
  ADD CONSTRAINT "StudentProgressUpdate_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProgressUpdate"
  ADD CONSTRAINT "StudentProgressUpdate_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProgressUpdate"
  ADD CONSTRAINT "StudentProgressUpdate_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
