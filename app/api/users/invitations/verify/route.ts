import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashInvitationToken } from '@/lib/user-invitations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    const invitation = await prisma.userInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(token) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation is invalid or has expired' }, { status: 404 });
    }

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('Verify invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
