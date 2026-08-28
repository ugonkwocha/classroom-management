import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { hashParentAccessToken, isParentAccessTokenValid, resolveParentClaimIdentity } from '@/lib/parent-access';
import { rateLimit } from '@/lib/rate-limit';

class ParentClaimError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function POST(request: NextRequest) {
  const limitedResponse = rateLimit(request, {
    keyPrefix: 'parent-access:complete',
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (limitedResponse) return limitedResponse;

  try {
    const body = await request.json();
    const token = String(body.token || '');
    const password = String(body.password || '');

    if (!token) {
      return NextResponse.json({ error: 'Setup link is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const accessToken = await tx.parentAccessToken.findUnique({
        where: { tokenHash: hashParentAccessToken(token) },
      });

      if (!isParentAccessTokenValid(accessToken, now)) {
        throw new ParentClaimError('This setup link is invalid or has expired', 404);
      }

      const claimed = await tx.parentAccessToken.updateMany({
        where: { id: accessToken!.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new ParentClaimError('This setup link has already been used', 409);
      }

      const guardians = await tx.parentGuardian.findMany({
        where: {
          isActive: true,
          needsReview: false,
          family: { isArchived: false },
          OR: [
            { emailNormalized: accessToken!.email },
            { email: { equals: accessToken!.email, mode: 'insensitive' } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, userId: true },
      });

      if (guardians.length === 0) {
        throw new ParentClaimError('We could not safely match this account. Please contact the academy.', 404);
      }

      const linkedUserIds = [...new Set(guardians.map((guardian) => guardian.userId).filter(Boolean))] as string[];
      if (linkedUserIds.length > 1) {
        throw new ParentClaimError('This family record needs academy review before access can be created.', 409);
      }

      const emailUser = await tx.user.findFirst({
        where: { email: { equals: accessToken!.email, mode: 'insensitive' } },
      });
      const linkedUser = linkedUserIds[0]
        ? await tx.user.findUnique({ where: { id: linkedUserIds[0] } })
        : null;

      const identity = resolveParentClaimIdentity(accessToken!.email, emailUser, linkedUser);
      if (identity.ok === false && identity.reason === 'REVIEW_REQUIRED') {
        throw new ParentClaimError('This family record needs academy review before access can be created.', 409);
      }
      if (identity.ok === false) {
        throw new ParentClaimError('This account is inactive. Please contact the academy.', 403);
      }

      let user = identity.user;
      const accountExists = Boolean(user);

      if (!user) {
        if (password.length < 8) {
          throw new ParentClaimError('Password must be at least 8 characters long', 400);
        }

        user = await tx.user.create({
          data: {
            email: accessToken!.email,
            password: await hashPassword(password),
            firstName: guardians[0].firstName,
            lastName: guardians[0].lastName,
            role: 'PARENT',
            isActive: true,
          },
        });
      }

      const existingParentRole = await tx.userRoleAssignment.findUnique({
        where: { userId_roleSlug: { userId: user.id, roleSlug: 'parent' } },
      });

      await tx.userRoleAssignment.upsert({
        where: { userId_roleSlug: { userId: user.id, roleSlug: 'parent' } },
        update: {},
        create: { userId: user.id, roleSlug: 'parent' },
      });

      await tx.parentGuardian.updateMany({
        where: {
          id: { in: guardians.map((guardian) => guardian.id) },
          OR: [{ userId: null }, { userId: user.id }],
        },
        data: { userId: user.id },
      });

      if (accountExists && !existingParentRole) {
        await tx.user.update({
          where: { id: user.id },
          data: { tokenVersion: { increment: 1 } },
        });
      }

      await tx.parentAccessToken.updateMany({
        where: { email: accessToken!.email, usedAt: null },
        data: { usedAt: now },
      });

      return {
        accountExists,
        linkedGuardianCount: guardians.length,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ParentClaimError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Parent access completion error:', error);
    return NextResponse.json({ error: 'Unable to complete parent portal setup' }, { status: 500 });
  }
}
