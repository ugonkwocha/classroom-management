import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { hashParentAccessToken, isParentAccessTokenValid, resolveParentClaimIdentity } from '@/lib/parent-access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limitedResponse = rateLimit(request, {
    keyPrefix: 'parent-access:verify',
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limitedResponse) return limitedResponse;

  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    if (!token) {
      return NextResponse.json({ error: 'Setup link is required' }, { status: 400 });
    }

    const accessToken = await prisma.parentAccessToken.findUnique({
      where: { tokenHash: hashParentAccessToken(token) },
    });

    if (!isParentAccessTokenValid(accessToken)) {
      return NextResponse.json({ error: 'This setup link is invalid or has expired' }, { status: 404 });
    }

    const guardians = await prisma.parentGuardian.findMany({
      where: {
        isActive: true,
        needsReview: false,
        family: { isArchived: false },
        OR: [
          { emailNormalized: accessToken!.email },
          { email: { equals: accessToken!.email, mode: 'insensitive' } },
        ],
      },
      select: { firstName: true, lastName: true, userId: true },
    });

    if (guardians.length === 0) {
      return NextResponse.json({ error: 'We could not safely match this account. Please contact the academy.' }, { status: 404 });
    }

    const linkedUserIds = [...new Set(guardians.map((guardian) => guardian.userId).filter(Boolean))];
    if (linkedUserIds.length > 1) {
      return NextResponse.json({ error: 'This family record needs academy review before access can be created.' }, { status: 409 });
    }

    const emailUser = await prisma.user.findFirst({
      where: {
        email: { equals: accessToken!.email, mode: 'insensitive' },
      },
      select: { id: true, email: true, isActive: true },
    });
    const linkedUser = linkedUserIds[0]
      ? await prisma.user.findUnique({
          where: { id: linkedUserIds[0] as string },
          select: { id: true, email: true, isActive: true },
        })
      : null;
    const identity = resolveParentClaimIdentity(accessToken!.email, emailUser, linkedUser);

    if (identity.ok === false && identity.reason === 'REVIEW_REQUIRED') {
      return NextResponse.json({ error: 'This family record needs academy review before access can be created.' }, { status: 409 });
    }
    if (identity.ok === false) {
      return NextResponse.json({ error: 'This account is inactive. Please contact the academy.' }, { status: 403 });
    }

    return NextResponse.json({
      firstName: guardians[0].firstName,
      accountExists: Boolean(identity.user),
      accountActive: true,
    });
  } catch (error) {
    console.error('Parent access verification error:', error);
    return NextResponse.json({ error: 'Unable to verify this setup link' }, { status: 500 });
  }
}
