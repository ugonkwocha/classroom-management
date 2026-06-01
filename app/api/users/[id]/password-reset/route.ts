import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { sendPasswordResetEmail } from '@/lib/email';
import {
  buildPasswordResetUrl,
  canResetUserPassword,
  createPasswordResetToken,
  getPasswordResetExpiry,
  hashPasswordResetToken,
} from '@/lib/password-resets';
import { rateLimit } from '@/lib/rate-limit';
import { logEmailDelivery } from '@/lib/email-logs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const limitedResponse = rateLimit(request, {
      keyPrefix: 'users:send-password-reset',
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (limitedResponse) return limitedResponse;

    const sessionUser = await getActiveSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    checkPermission(sessionUser.role, PERMISSIONS.RESET_USER_PASSWORD);

    const [targetUser, requestedBy] = await Promise.all([
      prisma.user.findUnique({
        where: { id: id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: sessionUser.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      }),
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!requestedBy) {
      return NextResponse.json({ error: 'Requesting user not found' }, { status: 404 });
    }

    if (!targetUser.isActive) {
      return NextResponse.json({ error: 'Cannot send a reset link to an inactive user' }, { status: 400 });
    }

    if (!canResetUserPassword(sessionUser.role, targetUser.role)) {
      return NextResponse.json({ error: 'You cannot reset this user password' }, { status: 403 });
    }

    const token = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = getPasswordResetExpiry();

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: {
          userId: targetUser.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: targetUser.id,
          requestedById: requestedBy.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    const resetUrl = buildPasswordResetUrl(token, request.headers.get('origin'));
    const emailDelivery = await sendPasswordResetEmail({
      recipient: {
        email: targetUser.email,
        name: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
      },
      requestedByName: `${requestedBy.firstName} ${requestedBy.lastName}`.trim() || requestedBy.email,
      resetUrl,
      expiresAt: expiresAt.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    });

    await logEmailDelivery({
      eventType: 'PASSWORD_RESET',
      recipientEmail: targetUser.email,
      recipientName: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
      recipientRole: targetUser.role,
      subject: 'Reset your 9jacodekids Academy password',
      providerMessageId: emailDelivery.messageId,
      error: emailDelivery.error,
      success: emailDelivery.success,
      triggeredById: requestedBy.id,
      payload: {
        targetUserId: targetUser.id,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return NextResponse.json({ success: true, emailDelivery });
  } catch (error: any) {
    if (error.message?.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('Send password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
