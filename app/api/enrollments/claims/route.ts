import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

function isAdminRole(role: string) {
  return role === 'SUPERADMIN' || role === 'ADMIN';
}

export async function POST(request: NextRequest) {
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

  if (!isAdminRole(sessionUser.role)) {
    return NextResponse.json(
      { error: 'Only admins and superadmins can assign waitlist items to staff.' },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    const enrollmentIds: string[] = Array.isArray(data.enrollmentIds)
      ? Array.from(new Set(data.enrollmentIds.filter((id: unknown): id is string => typeof id === 'string' && Boolean(id.trim()))))
      : [];
    const claimedById = typeof data.claimedById === 'string' ? data.claimedById : '';

    if (!claimedById) {
      return NextResponse.json(
        { error: 'Choose a staff member before assigning waitlist items.' },
        { status: 400 }
      );
    }

    if (enrollmentIds.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one waitlisted student.' },
        { status: 400 }
      );
    }

    const assignee = await prisma.user.findUnique({
      where: { id: claimedById },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!assignee || !assignee.isActive) {
      return NextResponse.json(
        { error: 'Selected staff member was not found or is inactive.' },
        { status: 400 }
      );
    }

    if (!['STAFF', 'ADMIN', 'SUPERADMIN'].includes(assignee.role)) {
      return NextResponse.json(
        { error: 'Selected assignee is not eligible for waitlist assignment.' },
        { status: 400 }
      );
    }

    const result = await prisma.programEnrollment.updateMany({
      where: {
        id: { in: enrollmentIds },
        status: 'WAITLIST',
      },
      data: {
        claimedById: assignee.id,
        claimExpiresAt: null,
      },
    });

    return NextResponse.json({
      assignedCount: result.count,
      assignee,
    });
  } catch (error) {
    console.error('Error assigning waitlist items to staff:', error);
    return NextResponse.json(
      { error: 'Failed to assign waitlist items to staff' },
      { status: 500 }
    );
  }
}
