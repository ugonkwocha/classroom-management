import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPasswordResetToken } from '@/lib/password-resets';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const limitedResponse = rateLimit(request, {
      keyPrefix: 'auth:password-reset-verify',
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (limitedResponse) return limitedResponse;

    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Password reset token is required' }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashPasswordResetToken(token) },
      select: {
        id: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date() || !resetToken.user.isActive) {
      return NextResponse.json({ error: 'This password reset link is invalid or has expired' }, { status: 404 });
    }

    return NextResponse.json({
      email: resetToken.user.email,
      firstName: resetToken.user.firstName,
      lastName: resetToken.user.lastName,
      expiresAt: resetToken.expiresAt,
    });
  } catch (error) {
    console.error('Verify password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
