import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
  try {
    const data = await request.json();

    const classData = await prisma.class.update({
      where: { id: params.id },
      data: {
        name: data.name,
        courseId: data.courseId,
        programId: data.programId,
        programLevel: data.programLevel,
        batch: data.batch,
        slot: data.slot,
        schedule: data.schedule,
        capacity: data.capacity,
        students: data.students,
        teacherId: data.teacherId,
        isArchived: data.isArchived,
      },
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
