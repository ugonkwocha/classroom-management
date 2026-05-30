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
  const sessionUser = await getActiveSessionUser(request);

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
    const teacherId = data.teacherId || null;
    const batch = Number(data.batch);

    if (teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          qualifiedCourses: true,
        },
      });

      if (!teacher || teacher.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'Selected tutor is not active or does not exist' },
          { status: 400 }
        );
      }

      if (!teacher.qualifiedCourses.includes(data.courseId)) {
        return NextResponse.json(
          { error: 'Selected tutor is not qualified to teach this course' },
          { status: 400 }
        );
      }

      const conflictingClass = await prisma.class.findFirst({
        where: {
          teacherId,
          programId: data.programId,
          batch,
          slot: data.slot,
          isArchived: false,
        },
        select: { name: true },
      });

      if (conflictingClass) {
        return NextResponse.json(
          {
            error: `Selected tutor is already assigned to "${conflictingClass.name}" at this batch and time slot.`,
          },
          { status: 409 }
        );
      }
    }

    const classData = await prisma.class.create({
      data: {
        name: data.name,
        courseId: data.courseId,
        programId: data.programId,
        programLevel: data.programLevel,
        batch,
        slot: data.slot,
        schedule: data.schedule,
        capacity: data.capacity,
        students: data.students || [],
        teacherId,
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
