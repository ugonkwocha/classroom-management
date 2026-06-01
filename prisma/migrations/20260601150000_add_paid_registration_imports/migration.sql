-- CreateEnum
CREATE TYPE "RegistrationImportSource" AS ENUM ('FLUENT_FORM_IMPORT', 'EXISTING_FAMILY');

-- CreateEnum
CREATE TYPE "ConfirmedRegistrationImportStatus" AS ENUM ('PROCESSED', 'NEEDS_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "CrmSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "FluentFormMapping" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "formName" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "defaultBatch" INTEGER NOT NULL DEFAULT 1,
    "defaultPriceType" "PriceType" NOT NULL DEFAULT 'FULL_PRICE',
    "leadTag" TEXT,
    "paidTag" TEXT NOT NULL,
    "removeLeadTagOnPaid" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FluentFormMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmedRegistrationImport" (
    "id" TEXT NOT NULL,
    "source" "RegistrationImportSource" NOT NULL DEFAULT 'FLUENT_FORM_IMPORT',
    "sourceFormId" TEXT,
    "sourceSubmissionId" TEXT,
    "formMappingId" TEXT,
    "parentFirstName" TEXT NOT NULL,
    "parentLastName" TEXT NOT NULL,
    "parentEmail" TEXT,
    "parentPhone" TEXT,
    "parentPhoneCountryCode" TEXT,
    "programId" TEXT NOT NULL,
    "defaultBatch" INTEGER NOT NULL DEFAULT 1,
    "expectedAmount" INTEGER,
    "confirmedAmount" INTEGER NOT NULL,
    "paymentProofNote" TEXT,
    "rawPayload" JSONB,
    "status" "ConfirmedRegistrationImportStatus" NOT NULL DEFAULT 'PROCESSED',
    "crmSyncStatus" "CrmSyncStatus" NOT NULL DEFAULT 'PENDING',
    "crmContactId" TEXT,
    "crmTag" TEXT,
    "crmError" TEXT,
    "familyId" TEXT,
    "importedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmedRegistrationImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmedRegistrationImportChild" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "phoneCountryCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "courseId" TEXT,
    "programId" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL DEFAULT 1,
    "priceType" "PriceType" NOT NULL DEFAULT 'FULL_PRICE',
    "priceAmount" INTEGER NOT NULL DEFAULT 0,
    "studentId" TEXT,
    "enrollmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmedRegistrationImportChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentPaymentRecord" (
    "id" TEXT NOT NULL,
    "source" "RegistrationImportSource" NOT NULL,
    "familyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "importId" TEXT,
    "amountConfirmed" INTEGER NOT NULL,
    "paymentProofNote" TEXT,
    "crmSyncStatus" "CrmSyncStatus" NOT NULL DEFAULT 'PENDING',
    "crmContactId" TEXT,
    "crmTag" TEXT,
    "crmError" TEXT,
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentPaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL,
    "importId" TEXT,
    "paymentRecordId" TEXT,
    "enrollmentId" TEXT,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "note" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportActivityLog" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FluentFormMapping_formId_key" ON "FluentFormMapping"("formId");
CREATE INDEX "FluentFormMapping_programId_idx" ON "FluentFormMapping"("programId");
CREATE INDEX "FluentFormMapping_isActive_idx" ON "FluentFormMapping"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ConfirmedRegistrationImport_source_sourceFormId_sourceSubmissionId_key" ON "ConfirmedRegistrationImport"("source", "sourceFormId", "sourceSubmissionId");
CREATE INDEX "ConfirmedRegistrationImport_programId_idx" ON "ConfirmedRegistrationImport"("programId");
CREATE INDEX "ConfirmedRegistrationImport_familyId_idx" ON "ConfirmedRegistrationImport"("familyId");
CREATE INDEX "ConfirmedRegistrationImport_importedById_idx" ON "ConfirmedRegistrationImport"("importedById");
CREATE INDEX "ConfirmedRegistrationImport_crmSyncStatus_idx" ON "ConfirmedRegistrationImport"("crmSyncStatus");
CREATE INDEX "ConfirmedRegistrationImport_createdAt_idx" ON "ConfirmedRegistrationImport"("createdAt");

-- CreateIndex
CREATE INDEX "ConfirmedRegistrationImportChild_importId_idx" ON "ConfirmedRegistrationImportChild"("importId");
CREATE INDEX "ConfirmedRegistrationImportChild_studentId_idx" ON "ConfirmedRegistrationImportChild"("studentId");
CREATE INDEX "ConfirmedRegistrationImportChild_programId_idx" ON "ConfirmedRegistrationImportChild"("programId");
CREATE INDEX "ConfirmedRegistrationImportChild_courseId_idx" ON "ConfirmedRegistrationImportChild"("courseId");

-- CreateIndex
CREATE INDEX "EnrollmentPaymentRecord_familyId_idx" ON "EnrollmentPaymentRecord"("familyId");
CREATE INDEX "EnrollmentPaymentRecord_studentId_idx" ON "EnrollmentPaymentRecord"("studentId");
CREATE INDEX "EnrollmentPaymentRecord_enrollmentId_idx" ON "EnrollmentPaymentRecord"("enrollmentId");
CREATE INDEX "EnrollmentPaymentRecord_importId_idx" ON "EnrollmentPaymentRecord"("importId");
CREATE INDEX "EnrollmentPaymentRecord_crmSyncStatus_idx" ON "EnrollmentPaymentRecord"("crmSyncStatus");
CREATE INDEX "EnrollmentPaymentRecord_createdAt_idx" ON "EnrollmentPaymentRecord"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentProof_importId_idx" ON "PaymentProof"("importId");
CREATE INDEX "PaymentProof_paymentRecordId_idx" ON "PaymentProof"("paymentRecordId");
CREATE INDEX "PaymentProof_enrollmentId_idx" ON "PaymentProof"("enrollmentId");
CREATE INDEX "PaymentProof_uploadedById_idx" ON "PaymentProof"("uploadedById");

-- CreateIndex
CREATE INDEX "ImportActivityLog_importId_idx" ON "ImportActivityLog"("importId");
CREATE INDEX "ImportActivityLog_actorId_idx" ON "ImportActivityLog"("actorId");
CREATE INDEX "ImportActivityLog_createdAt_idx" ON "ImportActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "FluentFormMapping" ADD CONSTRAINT "FluentFormMapping_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmedRegistrationImport" ADD CONSTRAINT "ConfirmedRegistrationImport_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfirmedRegistrationImport" ADD CONSTRAINT "ConfirmedRegistrationImport_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConfirmedRegistrationImport" ADD CONSTRAINT "ConfirmedRegistrationImport_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmedRegistrationImportChild" ADD CONSTRAINT "ConfirmedRegistrationImportChild_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ConfirmedRegistrationImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfirmedRegistrationImportChild" ADD CONSTRAINT "ConfirmedRegistrationImportChild_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConfirmedRegistrationImportChild" ADD CONSTRAINT "ConfirmedRegistrationImportChild_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfirmedRegistrationImportChild" ADD CONSTRAINT "ConfirmedRegistrationImportChild_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentPaymentRecord" ADD CONSTRAINT "EnrollmentPaymentRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnrollmentPaymentRecord" ADD CONSTRAINT "EnrollmentPaymentRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnrollmentPaymentRecord" ADD CONSTRAINT "EnrollmentPaymentRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ProgramEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnrollmentPaymentRecord" ADD CONSTRAINT "EnrollmentPaymentRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ConfirmedRegistrationImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ConfirmedRegistrationImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "EnrollmentPaymentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ProgramEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportActivityLog" ADD CONSTRAINT "ImportActivityLog_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ConfirmedRegistrationImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportActivityLog" ADD CONSTRAINT "ImportActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
