import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

const CLAIM_DURATION_MINUTES = 20;

function isAdminRole(role: string) {
  return role === 'SUPERADMIN' || role === 'ADMIN';
}

function isActiveClaim(enrollment: { claimedById: string | null; claimExpiresAt: Date | null }, now: Date) {
  return Boolean(enrollment.claimedById && (!enrollment.claimExpiresAt || enrollment.claimExpiresAt > now));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.MANAGE_WAITLIST);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CLAIM_DURATION_MINUTES * 60 * 1000);

    const enrollment = await prisma.$transaction(async (tx) => {
      const currentEnrollment = await tx.programEnrollment.findUnique({
        where: { id },
        include: {
          claimedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!currentEnrollment) {
        throw new Error('Enrollment not found');
      }

      if (currentEnrollment.status !== 'WAITLIST') {
        throw new Error('Only waitlisted enrollments can be claimed.');
      }

      const activeClaim = isActiveClaim(currentEnrollment, now);
      const claimedByAnotherUser = currentEnrollment.claimedById && currentEnrollment.claimedById !== sessionUser.userId;

      if (activeClaim && claimedByAnotherUser && !isAdminRole(sessionUser.role)) {
        const claimantName = currentEnrollment.claimedBy
          ? `${currentEnrollment.claimedBy.firstName} ${currentEnrollment.claimedBy.lastName}`
          : 'another user';
        throw new Error(`This waitlist item is already claimed by ${claimantName}.`);
      }

      return tx.programEnrollment.update({
        where: { id },
        data: {
          claimedById: sessionUser.userId,
          claimExpiresAt: expiresAt,
        },
        include: {
          claimedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      enrollment,
      claimDurationMinutes: CLAIM_DURATION_MINUTES,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to claim waitlist item';
    const status = message === 'Enrollment not found' ? 404 : 400;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.MANAGE_WAITLIST);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    const enrollment = await prisma.$transaction(async (tx) => {
      const currentEnrollment = await tx.programEnrollment.findUnique({
        where: { id },
      });

      if (!currentEnrollment) {
        throw new Error('Enrollment not found');
      }

      const isPersistentAssignment = Boolean(currentEnrollment.claimedById && !currentEnrollment.claimExpiresAt);
      const releaseAllowed =
        !currentEnrollment.claimedById ||
        isAdminRole(sessionUser.role) ||
        (currentEnrollment.claimedById === sessionUser.userId && !isPersistentAssignment);

      if (!releaseAllowed) {
        throw new Error('Only admin or superadmin can release admin-assigned waitlist work.');
      }

      return tx.programEnrollment.update({
        where: { id },
        data: {
          claimedById: null,
          claimExpiresAt: null,
        },
        include: {
          claimedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ enrollment });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to release waitlist claim';
    const status = message === 'Enrollment not found' ? 404 : 400;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
