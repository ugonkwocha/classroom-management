import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { normalizePaymentStatus } from '@/lib/student-payment-status';
import { sendEnrollmentAssignmentNotification } from '@/lib/enrollment-notifications';
import { ensureClassHasActivePreparationTemplate, MISSING_PREPARATION_TEMPLATE_ERROR } from '@/lib/course-email-template-requirements';

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
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.CREATE_ENROLLMENT);
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

    const batchNumber = data.batchNumber || 1;
    const existingEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        studentId: data.studentId,
        programId: data.programId,
        batchNumber,
        status: { notIn: ['COMPLETED', 'DROPPED'] },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        {
          error: `This student already has an enrollment for ${program.name} ${program.year} Batch ${batchNumber}.`,
        },
        { status: 409 }
      );
    }

    const status = data.status;
    const classId = status === 'ASSIGNED' ? data.classId || null : data.classId;

    if (status === 'ASSIGNED' && classId) {
      await ensureClassHasActivePreparationTemplate(prisma, classId);
    }

    const enrollment = await prisma.programEnrollment.create({
      data: {
        studentId: data.studentId,
        programId: data.programId,
        classId,
        batchNumber,
        status,
        paymentStatus: normalizePaymentStatus(data.paymentStatus || 'PENDING'),
        priceType: data.priceType || 'FULL_PRICE',
        priceAmount: data.priceAmount || 60000,
      },
      include: {
        student: true,
        program: true,
        class: true,
      },
    });

    console.log('Successfully created enrollment:', enrollment);
    let emailNotification = null;

    if (enrollment.status === 'ASSIGNED' && enrollment.classId) {
      try {
        emailNotification = await sendEnrollmentAssignmentNotification(enrollment.studentId, enrollment.classId, {
          enrollmentId: enrollment.id,
          triggeredById: sessionUser.userId,
        });
      } catch (emailError) {
        console.error('[POST /api/enrollments] Enrollment created, but email notification failed:', emailError);
        emailNotification = {
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Email notification failed',
        };
      }
    }

    return NextResponse.json({ ...enrollment, emailNotification }, { status: 201 });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: errorMessage === MISSING_PREPARATION_TEMPLATE_ERROR ? errorMessage : 'Failed to create enrollment',
        details: errorMessage,
      },
      { status: errorMessage === MISSING_PREPARATION_TEMPLATE_ERROR ? 400 : 500 }
    );
  }
}
