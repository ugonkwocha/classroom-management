import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { sendUserInvitationEmail } from '@/lib/email';
import {
  buildInvitationUrl,
  canInviteRole,
  createInvitationToken,
  getInvitationExpiry,
  hashInvitationToken,
  normalizeInviteEmail,
} from '@/lib/user-invitations';
import type { UserRole } from '@/types';

const invitationSelect = {
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
  invitedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    checkPermission(sessionUser.role, PERMISSIONS.READ_USERS);

    const roleFilter = sessionUser.role === 'SUPERADMIN' ? ['ADMIN', 'STAFF'] : ['STAFF'];

    const invitations = await prisma.userInvitation.findMany({
      where: {
        role: { in: roleFilter as UserRole[] },
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      select: invitationSelect,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invitations);
  } catch (error: any) {
    if (error.message?.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('Get user invitations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    checkPermission(sessionUser.role, PERMISSIONS.CREATE_USER);

    const body = await request.json();
    const email = normalizeInviteEmail(body.email || '');
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const role = body.role as UserRole;

    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Email, first name, last name, and role are required' }, { status: 400 });
    }

    if (!canInviteRole(sessionUser.role, role)) {
      return NextResponse.json({ error: 'You cannot invite users with that role' }, { status: 403 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    const inviter = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!inviter) {
      return NextResponse.json({ error: 'Inviting user not found' }, { status: 404 });
    }

    const token = createInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = getInvitationExpiry();

    const invitation = await prisma.$transaction(async (tx) => {
      await tx.userInvitation.updateMany({
        where: {
          email,
          status: 'PENDING',
        },
        data: {
          status: 'REVOKED',
        },
      });

      return tx.userInvitation.create({
        data: {
          email,
          firstName,
          lastName,
          role,
          tokenHash,
          expiresAt,
          invitedById: inviter.id,
        },
        select: invitationSelect,
      });
    });

    const invitationUrl = buildInvitationUrl(token, request.headers.get('origin'));
    const emailDelivery = await sendUserInvitationEmail({
      recipient: {
        email,
        name: `${firstName} ${lastName}`.trim(),
      },
      inviterName: `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email,
      role,
      invitationUrl,
      expiresAt: expiresAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });

    return NextResponse.json({ invitation, emailDelivery }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('Create user invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
