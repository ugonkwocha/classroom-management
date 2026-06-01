-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('CLASS_ASSIGNMENT', 'TEACHER_ASSIGNMENT', 'USER_INVITATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'DELIVERED', 'BOUNCED');

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "eventType" "EmailEventType" NOT NULL,
    "status" "EmailLogStatus" NOT NULL DEFAULT 'QUEUED',
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientRole" TEXT,
    "subject" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "providerMessageId" TEXT,
    "error" TEXT,
    "studentId" TEXT,
    "classId" TEXT,
    "enrollmentId" TEXT,
    "triggeredById" TEXT,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_eventType_idx" ON "EmailLog"("eventType");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_recipientEmail_idx" ON "EmailLog"("recipientEmail");

-- CreateIndex
CREATE INDEX "EmailLog_providerMessageId_idx" ON "EmailLog"("providerMessageId");

-- CreateIndex
CREATE INDEX "EmailLog_studentId_idx" ON "EmailLog"("studentId");

-- CreateIndex
CREATE INDEX "EmailLog_classId_idx" ON "EmailLog"("classId");

-- CreateIndex
CREATE INDEX "EmailLog_enrollmentId_idx" ON "EmailLog"("enrollmentId");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");
