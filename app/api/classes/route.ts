import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const sessionUser = getSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.READ_CLASSES);
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
    const archivedParam = searchParams.get('archived');

    const where: any = {};
    if (programId) where.programId = programId;
    if (archivedParam !== null) where.isArchived = archivedParam === 'true';

    const classes = await prisma.class.findMany({
      where,
      include: {
        course: true,
        program: true,
        teacher: true,
        enrollments: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const sessionUser = getSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.CREATE_CLASS);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    const data = await request.json();

    const classData = await prisma.class.create({
      data: {
        name: data.name,
        courseId: data.courseId,
        programId: data.programId,
        programLevel: data.programLevel,
        batch: data.batch,
        slot: data.slot,
        schedule: data.schedule,
        capacity: data.capacity,
        students: data.students || [],
        teacherId: data.teacherId,
        meetLink: data.meetLink || null,
        isArchived: false,
      },
      include: {
        course: true,
        program: true,
        teacher: true,
        enrollments: true,
      },
    });

    return NextResponse.json(classData, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
