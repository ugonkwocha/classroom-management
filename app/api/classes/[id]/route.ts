import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(
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
    const classData = await prisma.class.findUnique({
      where: { id: id },
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
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(classData);
  } catch (error) {
    console.error('Error fetching class:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_CLASS);
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
    const existingClass = await prisma.class.findUnique({
      where: { id },
      select: {
        id: true,
        courseId: true,
        programId: true,
        batch: true,
        slot: true,
        teacherId: true,
        isArchived: true,
      },
    });

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (Object.prototype.hasOwnProperty.call(data, 'name')) updateData.name = data.name;
    if (Object.prototype.hasOwnProperty.call(data, 'courseId')) updateData.courseId = data.courseId;
    if (Object.prototype.hasOwnProperty.call(data, 'programId')) updateData.programId = data.programId;
    if (Object.prototype.hasOwnProperty.call(data, 'programLevel')) updateData.programLevel = data.programLevel;
    if (Object.prototype.hasOwnProperty.call(data, 'batch')) updateData.batch = data.batch;
    if (Object.prototype.hasOwnProperty.call(data, 'slot')) updateData.slot = data.slot;
    if (Object.prototype.hasOwnProperty.call(data, 'schedule')) updateData.schedule = data.schedule;
    if (Object.prototype.hasOwnProperty.call(data, 'capacity')) updateData.capacity = data.capacity;
    if (Object.prototype.hasOwnProperty.call(data, 'students')) updateData.students = data.students;
    if (Object.prototype.hasOwnProperty.call(data, 'teacherId')) {
      updateData.teacherId = data.teacherId || null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'meetLink')) {
      updateData.meetLink = data.meetLink?.trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'isArchived')) updateData.isArchived = data.isArchived;

    const finalTeacherId = Object.prototype.hasOwnProperty.call(updateData, 'teacherId')
      ? updateData.teacherId
      : existingClass.teacherId;
    const finalCourseId = updateData.courseId ?? existingClass.courseId;
    const finalProgramId = updateData.programId ?? existingClass.programId;
    const finalBatch = Number(updateData.batch ?? existingClass.batch);
    const finalSlot = updateData.slot ?? existingClass.slot;
    const finalIsArchived = Object.prototype.hasOwnProperty.call(updateData, 'isArchived')
      ? updateData.isArchived
      : existingClass.isArchived;

    if (finalTeacherId && !finalIsArchived) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: finalTeacherId },
        select: {
          id: true,
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

      if (!teacher.qualifiedCourses.includes(finalCourseId)) {
        return NextResponse.json(
          { error: 'Selected tutor is not qualified to teach this course' },
          { status: 400 }
        );
      }

      const conflictingClass = await prisma.class.findFirst({
        where: {
          teacherId: finalTeacherId,
          programId: finalProgramId,
          batch: finalBatch,
          slot: finalSlot,
          isArchived: false,
          id: { not: id },
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

    const classData = await prisma.class.update({
      where: { id: id },
      data: updateData,
      include: {
        course: true,
        program: true,
        teacher: true,
        enrollments: true,
      },
    });

    return NextResponse.json(classData);
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
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
    checkPermission(sessionUser.role, PERMISSIONS.DELETE_CLASS);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    await prisma.class.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}
