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
    console.log('Creating enrollment with data:', data);

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
