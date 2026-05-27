import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
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

    const classData = await prisma.class.update({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
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
      where: { id: params.id },
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
