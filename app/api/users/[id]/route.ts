import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sessionUser = await getActiveSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    checkPermission(sessionUser.role, PERMISSIONS.READ_USERS);

    const user = await prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (sessionUser.role !== 'SUPERADMIN' && user.role !== 'STAFF') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(user);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sessionUser = await getActiveSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_USER);

    const body = await request.json();
    const { email, firstName, lastName, role, isActive } = body;

    const user = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isSelfSensitiveChange = id === sessionUser.userId && (
      (role && role !== user.role) ||
      isActive === false
    );

    if (isSelfSensitiveChange) {
      return NextResponse.json(
        { error: 'You cannot change your own role or deactivate your own account' },
        { status: 400 }
      );
    }

    const wouldRemoveSuperadminAccess = user.role === 'SUPERADMIN' && (
      (role && role !== 'SUPERADMIN') ||
      isActive === false
    );

    if (wouldRemoveSuperadminAccess) {
      const activeSuperadminCount = await prisma.user.count({
        where: {
          role: 'SUPERADMIN',
          isActive: true,
        },
      });

      if (activeSuperadminCount <= 1) {
        return NextResponse.json(
          { error: 'At least one active superadmin must remain on the platform' },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        ...(email && { email }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sessionUser = await getActiveSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    checkPermission(sessionUser.role, PERMISSIONS.DELETE_USER);

    const user = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (id === sessionUser.userId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    if (user.role === 'SUPERADMIN' && user.isActive) {
      const activeSuperadminCount = await prisma.user.count({
        where: {
          role: 'SUPERADMIN',
          isActive: true,
        },
      });

      if (activeSuperadminCount <= 1) {
        return NextResponse.json(
          { error: 'At least one active superadmin must remain on the platform' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
