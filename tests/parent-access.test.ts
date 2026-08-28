import { describe, expect, it } from 'vitest';

import {
  buildParentActivationUrl,
  createParentAccessToken,
  getAuthenticatedHome,
  getParentAccessExpiry,
  hashParentAccessToken,
  isParentAccessTokenValid,
  normalizeParentAccessEmail,
  resolveParentAccessOrigin,
  resolveParentClaimIdentity,
} from '@/lib/parent-access';

describe('parent account claim security', () => {
  it('normalizes email and stores only a one-way token hash', () => {
    const token = createParentAccessToken();
    const hash = hashParentAccessToken(token);

    expect(normalizeParentAccessEmail('  Parent@Example.COM ')).toBe('parent@example.com');
    expect(token).toHaveLength(43);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashParentAccessToken(token)).toBe(hash);
  });

  it('creates a 30-minute single-use window', () => {
    const now = new Date('2026-08-27T20:00:00.000Z');
    const expiresAt = getParentAccessExpiry(now);

    expect(expiresAt.toISOString()).toBe('2026-08-27T20:30:00.000Z');
    expect(isParentAccessTokenValid({ usedAt: null, expiresAt }, now)).toBe(true);
    expect(isParentAccessTokenValid({ usedAt: now, expiresAt }, now)).toBe(false);
    expect(isParentAccessTokenValid({ usedAt: null, expiresAt: now }, now)).toBe(false);
  });

  it('keeps activation links on the environment that received the request', () => {
    const origin = resolveParentAccessOrigin({
      requestOrigin: 'https://localhost:3000',
      forwardedHost: 'staging.9jacodekids.com',
      forwardedProto: 'https',
      configuredOrigin: 'https://localhost:3000',
    });

    expect(buildParentActivationUrl('token value', origin)).toBe(
      'https://staging.9jacodekids.com/parent-activate?token=token%20value'
    );
  });

  it('does not trust an arbitrary forwarded host for password setup links', () => {
    expect(
      resolveParentAccessOrigin({
        requestOrigin: 'https://localhost:3000',
        forwardedHost: 'attacker.example',
        forwardedProto: 'https',
        configuredOrigin: 'https://portal.9jacodekids.com',
      })
    ).toBe('https://portal.9jacodekids.com');
  });

  it('routes additive staff accounts to staff and parent-only accounts to the parent portal', () => {
    expect(getAuthenticatedHome(['parent'])).toBe('/parent');
    expect(getAuthenticatedHome(['parent', 'staff'])).toBe('/?tab=dashboard');
  });
});

describe('parent claim identity resolution', () => {
  const activeUser = {
    id: 'user-1',
    email: 'parent@example.com',
    isActive: true,
  };

  it('allows a new parent account when no user exists', () => {
    expect(resolveParentClaimIdentity('parent@example.com', null, null)).toEqual({
      ok: true,
      user: null,
    });
  });

  it('allows an existing active account without changing its identity', () => {
    expect(resolveParentClaimIdentity('PARENT@example.com', activeUser, activeUser)).toEqual({
      ok: true,
      user: activeUser,
    });
  });

  it('requires staff review when the email account and linked account conflict', () => {
    expect(
      resolveParentClaimIdentity('parent@example.com', activeUser, {
        ...activeUser,
        id: 'user-2',
      })
    ).toEqual({ ok: false, reason: 'REVIEW_REQUIRED' });
  });

  it('does not claim a linked account with another email or an inactive account', () => {
    expect(
      resolveParentClaimIdentity('parent@example.com', null, {
        ...activeUser,
        email: 'someone-else@example.com',
      })
    ).toEqual({ ok: false, reason: 'REVIEW_REQUIRED' });

    expect(
      resolveParentClaimIdentity('parent@example.com', { ...activeUser, isActive: false }, null)
    ).toEqual({ ok: false, reason: 'INACTIVE_ACCOUNT' });
  });
});
