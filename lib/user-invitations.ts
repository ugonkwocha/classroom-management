import crypto from 'crypto';
import type { UserRole } from '@/types';

export const INVITATION_EXPIRY_DAYS = 7;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createInvitationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashInvitationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getInvitationExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
  return expiresAt;
}

export function canInviteRole(inviterRole: UserRole, invitedRole: UserRole): boolean {
  if (inviterRole === 'SUPERADMIN') {
    return invitedRole === 'ADMIN' || invitedRole === 'STAFF';
  }

  if (inviterRole === 'ADMIN') {
    return invitedRole === 'STAFF';
  }

  return false;
}

export function getInvitableRoles(inviterRole: UserRole | undefined): UserRole[] {
  if (inviterRole === 'SUPERADMIN') return ['ADMIN', 'STAFF'];
  if (inviterRole === 'ADMIN') return ['STAFF'];
  return [];
}

export function getAppBaseUrl(requestOrigin?: string | null): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    requestOrigin ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

export function buildInvitationUrl(token: string, requestOrigin?: string | null): string {
  return `${getAppBaseUrl(requestOrigin)}/accept-invite?token=${encodeURIComponent(token)}`;
}
