ALTER TYPE "EmailEventType" ADD VALUE IF NOT EXISTS 'CERTIFICATE_DELIVERY';

ALTER TABLE "ProgramBatchSchedule" ADD COLUMN "endDate" TIMESTAMP(3);

CREATE TYPE "CompletionOutcome" AS ENUM ('COMPLETED', 'NOT_COMPLETED');
CREATE TYPE "CertificateStatus" AS ENUM ('ISSUED', 'REVOKED');

ALTER TABLE "EmailLog" ADD COLUMN "certificateId" TEXT;
CREATE INDEX "EmailLog_certificateId_idx" ON "EmailLog"("certificateId");

CREATE TABLE "CertificateSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "signatoryName" TEXT NOT NULL DEFAULT '',
  "signatoryTitle" TEXT NOT NULL DEFAULT '',
  "signaturePath" TEXT,
  "emailSubject" TEXT NOT NULL DEFAULT 'Your 9jacodekids certificate - {{courseName}}',
  "emailMessage" TEXT NOT NULL DEFAULT 'Congratulations {{studentName}} on completing {{courseName}}. Your certificate is attached.',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CertificateSettings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CertificateSettings_isActive_idx" ON "CertificateSettings"("isActive");

CREATE TABLE "CourseCertificateTemplate" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "certificateTitle" TEXT NOT NULL,
  "achievementWording" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseCertificateTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseCertificateTemplate_courseId_key" ON "CourseCertificateTemplate"("courseId");
CREATE INDEX "CourseCertificateTemplate_isActive_idx" ON "CourseCertificateTemplate"("isActive");
ALTER TABLE "CourseCertificateTemplate" ADD CONSTRAINT "CourseCertificateTemplate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CourseCertificateTemplate" (
  "id", "courseId", "certificateTitle", "achievementWording", "isActive", "updatedAt"
)
SELECT
  'certificate-template-' || "id",
  "id",
  "name",
  'and demonstrating an understanding of the core concepts and skills covered in this course.',
  false,
  CURRENT_TIMESTAMP
FROM "Course"
ON CONFLICT ("courseId") DO NOTHING;

INSERT INTO "CertificateSettings" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "ClassCompletionDecision" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "outcome" "CompletionOutcome" NOT NULL,
  "reason" TEXT,
  "reviewedById" TEXT NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassCompletionDecision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClassCompletionDecision_classId_studentId_key" ON "ClassCompletionDecision"("classId", "studentId");
CREATE INDEX "ClassCompletionDecision_classId_outcome_idx" ON "ClassCompletionDecision"("classId", "outcome");
CREATE INDEX "ClassCompletionDecision_studentId_idx" ON "ClassCompletionDecision"("studentId");
CREATE INDEX "ClassCompletionDecision_enrollmentId_idx" ON "ClassCompletionDecision"("enrollmentId");
ALTER TABLE "ClassCompletionDecision" ADD CONSTRAINT "ClassCompletionDecision_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassCompletionDecision" ADD CONSTRAINT "ClassCompletionDecision_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassCompletionDecision" ADD CONSTRAINT "ClassCompletionDecision_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ProgramEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassCompletionDecision" ADD CONSTRAINT "ClassCompletionDecision_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StudentCertificate" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "certificateNumber" TEXT NOT NULL,
  "verificationToken" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "CertificateStatus" NOT NULL DEFAULT 'ISSUED',
  "studentNameSnapshot" TEXT NOT NULL,
  "courseTitleSnapshot" TEXT NOT NULL,
  "achievementSnapshot" TEXT NOT NULL,
  "classNameSnapshot" TEXT NOT NULL,
  "programNameSnapshot" TEXT NOT NULL,
  "completionDate" TIMESTAMP(3) NOT NULL,
  "signatoryNameSnapshot" TEXT NOT NULL,
  "signatoryTitleSnapshot" TEXT NOT NULL,
  "signaturePathSnapshot" TEXT,
  "pdfPath" TEXT NOT NULL,
  "issuedById" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentCertificate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentCertificate_certificateNumber_key" ON "StudentCertificate"("certificateNumber");
CREATE UNIQUE INDEX "StudentCertificate_verificationToken_key" ON "StudentCertificate"("verificationToken");
CREATE UNIQUE INDEX "StudentCertificate_classId_studentId_version_key" ON "StudentCertificate"("classId", "studentId", "version");
CREATE INDEX "StudentCertificate_classId_status_idx" ON "StudentCertificate"("classId", "status");
CREATE INDEX "StudentCertificate_studentId_status_idx" ON "StudentCertificate"("studentId", "status");
CREATE INDEX "StudentCertificate_enrollmentId_idx" ON "StudentCertificate"("enrollmentId");
CREATE INDEX "StudentCertificate_courseId_idx" ON "StudentCertificate"("courseId");
CREATE INDEX "StudentCertificate_programId_idx" ON "StudentCertificate"("programId");
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ProgramEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
