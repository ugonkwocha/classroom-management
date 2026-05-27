import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

function canManageInvitation(
  sessionRole: string,
  sessionUserId: string,
  invitation: { role: string; invitedById: string; status: string }
): boolean {
  if (invitation.status !== 'PENDING') {
    return false;
  }

  if (sessionRole === 'SUPERADMIN') {
    return true;
  }

  if (sessionRole === 'ADMIN') {
    return invitation.role === 'STAFF' && invitation.invitedById === sessionUserId;
  }

  return false;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getActiveSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    checkPermission(sessionUser.role, PERMISSIONS.CREATE_USER);

    const invitation = await prisma.userInvitation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        role: true,
        status: true,
        invitedById: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (!canManageInvitation(sessionUser.role, sessionUser.userId, invitation)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const revokedInvitation = await prisma.userInvitation.update({
      where: { id: params.id },
      data: { status: 'REVOKED' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(revokedInvitation);
  } catch (error: any) {
    if (error.message?.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('Revoke user invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getActiveSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    checkPermission(sessionUser.role, PERMISSIONS.CREATE_USER);

    const invitation = await prisma.userInvitation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        role: true,
        status: true,
        invitedById: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (!canManageInvitation(sessionUser.role, sessionUser.userId, invitation)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.userInvitation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('Delete user invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
