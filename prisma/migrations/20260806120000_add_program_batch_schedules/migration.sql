-- Add optional per-batch start dates without changing existing program or enrollment records.
CREATE TABLE "ProgramBatchSchedule" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramBatchSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgramBatchSchedule_programId_batchNumber_key"
ON "ProgramBatchSchedule"("programId", "batchNumber");

CREATE INDEX "ProgramBatchSchedule_programId_idx"
ON "ProgramBatchSchedule"("programId");

CREATE INDEX "ProgramBatchSchedule_startDate_idx"
ON "ProgramBatchSchedule"("startDate");

ALTER TABLE "ProgramBatchSchedule"
ADD CONSTRAINT "ProgramBatchSchedule_programId_fkey"
FOREIGN KEY ("programId") REFERENCES "Program"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
