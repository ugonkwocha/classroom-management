import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    const where: any = {};
    if (studentId) where.studentId = studentId;

    const courseHistory = await prisma.courseHistory.findMany({
      where,
      include: {
        student: true,
      },
      orderBy: {
        dateAdded: 'desc',
      },
    });

    return NextResponse.json(courseHistory);
  } catch (error) {
    console.error('Error fetching course history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('Creating course history with data:', data);

    const history = await prisma.courseHistory.create({
      data: {
        studentId: data.studentId,
        courseId: data.courseId,
        courseName: data.courseName,
        programId: data.programId,
        programName: data.programName,
        batch: data.batch || 1,
        year: data.year,
        completionStatus: data.completionStatus,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        performanceNotes: data.performanceNotes,
      },
      include: {
        student: true,
      },
    });

    console.log('Successfully created course history:', history);
    return NextResponse.json(history, { status: 201 });
  } catch (error) {
    console.error('Error creating course history:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create course history', details: errorMessage },
      { status: 500 }
    );
  }
}
