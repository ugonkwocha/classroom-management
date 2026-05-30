import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@/types';
import prisma from '@/lib/prisma';

const JWT_EXPIRY = '12h';
export const AUTH_COOKIE_NAME = 'academy_session';
export const JWT_MAX_AGE_SECONDS = 12 * 60 * 60;
const BCRYPT_ROUNDS = 10;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }

  return secret || 'development-only-secret';
}

// Password hashing and verification
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT token generation and verification
export function generateToken(user: Pick<User, 'id' | 'email' | 'role'> & { tokenVersion?: number }): string {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion || 0,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRY,
  });
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as TokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

function getTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!sessionCookie) return null;

  return decodeURIComponent(sessionCookie.slice(AUTH_COOKIE_NAME.length + 1));
}

export function getSessionUser(request: Request): TokenPayload | null {
  const authHeader = request.headers.get('authorization');
  const token = getTokenFromHeader(authHeader) || getTokenFromCookieHeader(request.headers.get('cookie'));

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function getActiveSessionUser(request: Request): Promise<TokenPayload | null> {
  const sessionUser = getSessionUser(request);

  if (!sessionUser) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      tokenVersion: true,
    },
  });

  if (!user?.isActive || (sessionUser.tokenVersion || 0) !== user.tokenVersion) {
    return null;
  }

  return {
    ...sessionUser,
    email: user.email,
    role: user.role as UserRole,
  };
}
