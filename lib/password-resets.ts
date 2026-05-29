import crypto from 'crypto';
import type { UserRole } from '@/types';
import { getAppBaseUrl } from '@/lib/user-invitations';

export const PASSWORD_RESET_EXPIRY_HOURS = 24;

export function createPasswordResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getPasswordResetExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRY_HOURS);
  return expiresAt;
}

export function buildPasswordResetUrl(token: string, requestOrigin?: string | null): string {
  return `${getAppBaseUrl(requestOrigin)}/reset-password?token=${encodeURIComponent(token)}`;
}

export function canResetUserPassword(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'SUPERADMIN') {
    return targetRole === 'ADMIN' || targetRole === 'STAFF';
  }

  if (actorRole === 'ADMIN') {
    return targetRole === 'STAFF';
  }

  return false;
}
