import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import {
  buildParentActivationUrl,
  createParentAccessToken,
  getParentAccessExpiry,
  hashParentAccessToken,
  normalizeParentAccessEmail,
  resolveParentClaimIdentity,
} from '@/lib/parent-access';
import { sendParentPortalActivationEmail } from '@/lib/email';
import { logEmailDelivery } from '@/lib/email-logs';

const GENERIC_RESPONSE = {
  message: 'If that email matches an active family record, we will send a secure setup link shortly.',
};

export async function POST(request: NextRequest) {
  const limitedResponse = rateLimit(request, {
    keyPrefix: 'parent-access:request',
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (limitedResponse) return limitedResponse;

  try {
    const body = await request.json();
    const email = normalizeParentAccessEmail(String(body.email || ''));

    if (!email || !email.includes('@')) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const guardians = await prisma.parentGuardian.findMany({
      where: {
        isActive: true,
        needsReview: false,
        family: { isArchived: false },
        OR: [
          { emailNormalized: email },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
      select: {
        firstName: true,
        lastName: true,
        userId: true,
      },
    });

    if (guardians.length === 0) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const linkedUserIds = [...new Set(guardians.map((guardian) => guardian.userId).filter(Boolean))] as string[];
    if (linkedUserIds.length > 1) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const emailUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, isActive: true },
    });
    const linkedUser = linkedUserIds[0]
      ? await prisma.user.findUnique({
          where: { id: linkedUserIds[0] },
          select: { id: true, email: true, isActive: true },
        })
      : null;
    const identity = resolveParentClaimIdentity(email, emailUser, linkedUser);
    if (!identity.ok) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const accountExists = Boolean(identity.user);
    const token = createParentAccessToken();
    const expiresAt = getParentAccessExpiry();

    await prisma.$transaction([
      prisma.parentAccessToken.updateMany({
        where: { email, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.parentAccessToken.create({
        data: {
          email,
          tokenHash: hashParentAccessToken(token),
          expiresAt,
        },
      }),
    ]);

    const recipientName = `${guardians[0].firstName} ${guardians[0].lastName}`.trim();
    const activationUrl = buildParentActivationUrl(token, request.nextUrl.origin);
    const delivery = await sendParentPortalActivationEmail({
      recipient: { email, name: recipientName },
      activationUrl,
      expiresAt: expiresAt.toLocaleString('en-CA', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Toronto',
      }),
      accountExists,
    });

    try {
      await logEmailDelivery({
        eventType: 'PARENT_PORTAL_ACTIVATION',
        recipientEmail: email,
        recipientName,
        recipientRole: 'PARENT',
        subject: 'Set up your 9jacodekids parent portal',
        provider: delivery.provider,
        providerMessageId: delivery.messageId,
        error: delivery.error,
        success: delivery.success,
        payload: { accountExists, attemptedProviders: delivery.attemptedProviders || [] },
      });
    } catch (error) {
      console.error('Parent access email log error:', error);
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('Parent access request error:', error);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
