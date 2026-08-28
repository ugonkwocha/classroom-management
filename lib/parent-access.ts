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

type ParentAccessOriginInput = {
  requestOrigin?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  configuredOrigin?: string | null;
};

function parseOrigin(value?: string | null): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAcademyHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === '9jacodekids.com' || normalized.endsWith('.9jacodekids.com');
}

export function resolveParentAccessOrigin({
  requestOrigin,
  forwardedHost,
  forwardedProto,
  configuredOrigin = getAppBaseUrl(),
}: ParentAccessOriginInput): string {
  const proxyHost = forwardedHost?.split(',')[0]?.trim();
  const proxyProtocol = forwardedProto?.split(',')[0]?.trim().replace(/:$/, '') || 'https';
  const forwardedOrigin = parseOrigin(proxyHost ? `${proxyProtocol}://${proxyHost}` : null);
  const requestUrl = parseOrigin(requestOrigin);
  const configuredUrl = parseOrigin(configuredOrigin);

  for (const candidate of [forwardedOrigin, requestUrl]) {
    if (candidate && isAcademyHostname(candidate.hostname)) {
      candidate.protocol = 'https:';
      return candidate.origin;
    }
  }

  if (configuredUrl && !['localhost', '127.0.0.1', '::1'].includes(configuredUrl.hostname)) {
    return configuredUrl.origin;
  }

  return requestUrl?.origin || configuredUrl?.origin || 'http://localhost:3000';
}

export function buildParentActivationUrl(token: string, origin?: string | null): string {
  const baseUrl = (origin || getAppBaseUrl()).replace(/\/$/, '');
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
