import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AUTH_COOKIE_NAME, JWT_MAX_AGE_SECONDS, verifyPassword, generateToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { getUserRoleSlugs } from '@/lib/access-control';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const limitedResponse = rateLimit(request, {
      keyPrefix: 'auth:login',
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (limitedResponse) return limitedResponse;

    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role as any,
      tokenVersion: user.tokenVersion,
    });
    const roleSlugs = await getUserRoleSlugs(user.id);

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        roleSlugs,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: JWT_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
