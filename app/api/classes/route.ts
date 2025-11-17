import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const archived = searchParams.get('archived') === 'true';

    const where: any = {};
    if (programId) where.programId = programId;
    if (archived !== undefined) where.isArchived = archived;

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
