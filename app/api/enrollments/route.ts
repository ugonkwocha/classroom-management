import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const programId = searchParams.get('programId');
    const status = searchParams.get('status');

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (programId) where.programId = programId;
    if (status) where.status = status;

    const enrollments = await prisma.programEnrollment.findMany({
      where,
      include: {
        student: true,
        program: true,
        class: true,
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    });

    return NextResponse.json(enrollments);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('[API] Creating enrollment with data:', data);
    console.log('[API] Stack trace:', new Error().stack);

    // Fetch the program to check if enrollment is allowed based on start date
    const program = await prisma.program.findUnique({
      where: { id: data.programId },
    });

    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    // Check if program can accept enrollments based on start date
    if (program.startDate) {
      const startDate = new Date(program.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      if (program.type === 'WEEKEND_CLUB' && daysPassed > 28) {
        return NextResponse.json(
          { error: `Cannot enroll in weekend programs more than 4 weeks after the start date (${daysPassed} days have passed)` },
          { status: 400 }
        );
      } else if (program.type === 'HOLIDAY_CAMP' && daysPassed > 5) {
        return NextResponse.json(
          { error: `Cannot enroll in holiday programs more than 5 days after the start date (${daysPassed} days have passed)` },
          { status: 400 }
        );
      }
    }

    const enrollment = await prisma.programEnrollment.create({
      data: {
        studentId: data.studentId,
        programId: data.programId,
        classId: data.classId,
        batchNumber: data.batchNumber || 1,
        status: data.status,
        paymentStatus: data.paymentStatus || 'PENDING',
      },
      include: {
        student: true,
        program: true,
        class: true,
      },
    });

    console.log('Successfully created enrollment:', enrollment);
    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create enrollment', details: errorMessage },
      { status: 500 }
    );
  }
}
