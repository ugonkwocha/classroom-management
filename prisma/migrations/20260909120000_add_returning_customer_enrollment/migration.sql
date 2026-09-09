ALTER TYPE "RegistrationImportSource" ADD VALUE 'RETURNING_CUSTOMER';
ALTER TYPE "EmailEventType" ADD VALUE 'PAID_ENROLLMENT_CONFIRMATION';

ALTER TABLE "ProgramBatchSchedule" ADD COLUMN "paidCrmTag" TEXT;

WITH unambiguous_tags AS (
  SELECT
    ffm."programId",
    ffom."batchNumber",
    MIN(COALESCE(NULLIF(BTRIM(ffom."paidTag"), ''), BTRIM(ffm."paidTag"))) AS "paidCrmTag"
  FROM "FluentFormOptionMapping" ffom
  INNER JOIN "FluentFormMapping" ffm ON ffm."id" = ffom."formMappingId"
  WHERE ffom."isActive" = TRUE
    AND ffm."isActive" = TRUE
    AND COALESCE(NULLIF(BTRIM(ffom."paidTag"), ''), BTRIM(ffm."paidTag")) <> ''
  GROUP BY ffm."programId", ffom."batchNumber"
  HAVING COUNT(DISTINCT COALESCE(NULLIF(BTRIM(ffom."paidTag"), ''), BTRIM(ffm."paidTag"))) = 1
)
UPDATE "ProgramBatchSchedule" pbs
SET "paidCrmTag" = unambiguous_tags."paidCrmTag"
FROM unambiguous_tags
WHERE pbs."programId" = unambiguous_tags."programId"
  AND pbs."batchNumber" = unambiguous_tags."batchNumber";
