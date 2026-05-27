-- Treat historical COMPLETED payment records as CONFIRMED.
-- The enum value remains for backwards-compatible reads, but the app no longer writes it.
UPDATE "ProgramEnrollment"
SET "paymentStatus" = 'CONFIRMED'
WHERE "paymentStatus" = 'COMPLETED';

UPDATE "Student"
SET "paymentStatus" = 'CONFIRMED'
WHERE "paymentStatus" = 'COMPLETED';
