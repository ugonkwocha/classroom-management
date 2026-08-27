import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20260827120000_add_portal_identity_foundation/migration.sql'
);
const migration = readFileSync(migrationPath, 'utf8');

describe('portal identity migration', () => {
  it('seeds every planned role and backfills the legacy role', () => {
    for (const roleSlug of ['superadmin', 'admin', 'staff', 'parent', 'tutor', 'student']) {
      expect(migration).toContain(`('${roleSlug}'`);
    }

    expect(migration).toContain('LOWER("role"::text)');
    expect(migration).toContain('ON CONFLICT ("userId", "roleSlug") DO NOTHING');
    expect(migration).toContain('ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS \'PARENT\'');
    expect(migration).toContain('ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS \'TUTOR\'');
    expect(migration).toContain('ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS \'STUDENT\'');
  });

  it('links tutors one-to-one and allows one user to represent guardians in multiple families', () => {
    expect(migration).toContain('CREATE UNIQUE INDEX "Teacher_userId_key"');
    expect(migration).toContain('CREATE INDEX "ParentGuardian_userId_idx"');
    expect(migration).not.toContain('CREATE UNIQUE INDEX "ParentGuardian_userId_key"');
  });

  it('removes profile links rather than deleting business records when an account is deleted', () => {
    expect(migration).toContain('"Teacher_userId_fkey"');
    expect(migration).toContain('"ParentGuardian_userId_fkey"');
    expect(migration.match(/ON DELETE SET NULL/g)).toHaveLength(3);
  });
});
