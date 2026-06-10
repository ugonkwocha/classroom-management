import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.READ_ENROLLMENTS);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const batchNumber = searchParams.get('batchNumber');
    const year = searchParams.get('year');

    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        status: 'WAITLIST',
        ...(programId ? { programId } : {}),
        ...(batchNumber ? { batchNumber: Number(batchNumber) } : {}),
        ...(year ? { program: { year: Number(year) } } : {}),
      },
      include: {
        student: {
          include: {
            family: {
              include: {
                guardians: {
                  where: { isActive: true },
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                },
              },
            },
            enrollments: {
              include: {
                class: true,
                program: true,
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
            },
          },
        },
        program: true,
        class: true,
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
      orderBy: [
        { program: { year: 'desc' } },
        { program: { name: 'asc' } },
        { batchNumber: 'asc' },
        { enrollmentDate: 'asc' },
      ],
    });

    return NextResponse.json({
      currentUserId: sessionUser.userId,
      claimDurationMinutes: 20,
      enrollments,
    });
  } catch (error) {
    console.error('Error fetching waitlist queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist queue' },
      { status: 500 }
    );
  }
}
