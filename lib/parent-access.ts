import crypto from 'crypto';
import { getAppBaseUrl } from '@/lib/user-invitations';
import type { RoleSlug } from '@/types';

export const PARENT_ACCESS_EXPIRY_MINUTES = 30;

export function normalizeParentAccessEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createParentAccessToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashParentAccessToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getParentAccessExpiry(now = new Date()): Date {
  return new Date(now.getTime() + PARENT_ACCESS_EXPIRY_MINUTES * 60 * 1000);
}

export function buildParentActivationUrl(token: string, requestOrigin?: string | null): string {
  const baseUrl = (requestOrigin || getAppBaseUrl()).replace(/\/$/, '');
  return `${baseUrl}/parent-activate?token=${encodeURIComponent(token)}`;
}

export function getAuthenticatedHome(roleSlugs: RoleSlug[] | undefined): string {
  const roles = roleSlugs || [];
  if (roles.some((role) => role === 'superadmin' || role === 'admin' || role === 'staff')) {
    return '/?tab=dashboard';
  }
  if (roles.includes('parent')) return '/parent';
  if (roles.includes('tutor')) return '/tutor';
  return '/login';
}

export function isParentAccessTokenValid(
  token: { usedAt: Date | null; expiresAt: Date } | null | undefined,
  now = new Date()
): boolean {
  return Boolean(token && !token.usedAt && token.expiresAt > now);
}

type ParentClaimUser = {
  id: string;
  email: string;
  isActive: boolean;
};

export type ParentClaimIdentityResult =
  | { ok: true; user: ParentClaimUser | null }
  | { ok: false; reason: 'REVIEW_REQUIRED' | 'INACTIVE_ACCOUNT' };

export function resolveParentClaimIdentity(
  email: string,
  emailUser: ParentClaimUser | null,
  linkedUser: ParentClaimUser | null
): ParentClaimIdentityResult {
  if (emailUser && linkedUser && emailUser.id !== linkedUser.id) {
    return { ok: false, reason: 'REVIEW_REQUIRED' };
  }

  const user = emailUser || linkedUser;
  if (!user) return { ok: true, user: null };

  if (normalizeParentAccessEmail(user.email) !== normalizeParentAccessEmail(email)) {
    return { ok: false, reason: 'REVIEW_REQUIRED' };
  }

  if (!user.isActive) {
    return { ok: false, reason: 'INACTIVE_ACCOUNT' };
  }

  return { ok: true, user };
}
