import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260827231000_add_parent_portal_activation/migration.sql'
  ),
  'utf8'
);

describe('parent portal activation migration', () => {
  it('adds the parent activation email event safely', () => {
    expect(migration).toContain(
      'ALTER TYPE "EmailEventType" ADD VALUE IF NOT EXISTS \'PARENT_PORTAL_ACTIVATION\''
    );
  });

  it('creates hashed, expiring, single-use parent access records', () => {
    expect(migration).toContain('CREATE TABLE "ParentAccessToken"');
    expect(migration).toContain('"tokenHash" TEXT NOT NULL');
    expect(migration).toContain('"expiresAt" TIMESTAMP(3) NOT NULL');
    expect(migration).toContain('"usedAt" TIMESTAMP(3)');
    expect(migration).toContain('CREATE UNIQUE INDEX "ParentAccessToken_tokenHash_key"');
    expect(migration).not.toContain('"token" TEXT');
  });
});
