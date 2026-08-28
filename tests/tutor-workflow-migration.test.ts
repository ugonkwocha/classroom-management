import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'prisma/migrations/20260828011500_add_tutor_class_workflow/migration.sql'),
  'utf8'
);

describe('tutor class workflow migration', () => {
  it('links tutor invitations to a stable tutor profile', () => {
    expect(migration).toContain('ALTER TABLE "UserInvitation" ADD COLUMN "targetTeacherId" TEXT');
    expect(migration).toContain('"UserInvitation_targetTeacherId_fkey"');
    expect(migration).toContain('ON DELETE SET NULL');
  });

  it('enforces one attendance and progress record per learner and session', () => {
    expect(migration).toContain('CREATE TABLE "ClassSession"');
    expect(migration).toContain('CREATE TABLE "AttendanceRecord"');
    expect(migration).toContain('CREATE TABLE "StudentProgressUpdate"');
    expect(migration).toContain('CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key"');
    expect(migration).toContain('CREATE UNIQUE INDEX "StudentProgressUpdate_sessionId_studentId_key"');
  });
});
