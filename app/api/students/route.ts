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
    checkPermission(sessionUser.role, PERMISSIONS.READ_STUDENTS);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    const students = await prisma.student.findMany({
      include: {
        enrollments: {
          include: {
            class: true,
            program: true,
          },
        },
        courseHistory: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('[API GET /api/students] Returning', students.length, 'students');
    if (students.length > 0) {
      console.log('[API GET /api/students] First student enrollments:', students[0].enrollments?.length || 0);
    }

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
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
    checkPermission(sessionUser.role, PERMISSIONS.CREATE_STUDENT);
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
    console.log('[API] POST /api/students received data keys:', Object.keys(data));
    console.log('[API] programEnrollments in request:', data.programEnrollments ? 'YES' : 'NO');

    // Validate uniqueness for email, phone, parentEmail, and parentPhone
    const validationErrors: string[] = [];

    if (data.email) {
      const existingEmail = await prisma.student.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        validationErrors.push(`Email "${data.email}" is already in use by another student`);
      }
    }

    if (data.phone) {
      const existingPhone = await prisma.student.findFirst({
        where: { phone: data.phone },
      });
      if (existingPhone) {
        validationErrors.push(`Phone number "${data.phone}" is already in use by another student`);
      }
    }

    if (data.parentEmail) {
      const existingParentEmail = await prisma.student.findFirst({
        where: { parentEmail: data.parentEmail },
      });
      if (existingParentEmail) {
        validationErrors.push(`Parent email "${data.parentEmail}" is already in use by another student's parent`);
      }
    }

    if (data.parentPhone) {
      const existingParentPhone = await prisma.student.findFirst({
        where: { parentPhone: data.parentPhone },
      });
      if (existingParentPhone) {
        validationErrors.push(`Parent phone number "${data.parentPhone}" is already in use by another student's parent`);
      }
    }

    // Cross-validation: Student and parent shouldn't have the same email or phone
    if (data.email && data.parentEmail && data.email.toLowerCase() === data.parentEmail.toLowerCase()) {
      validationErrors.push(`Student email and parent email cannot be the same`);
    }

    if (data.phone && data.parentPhone && data.phone === data.parentPhone) {
      validationErrors.push(`Student phone and parent phone cannot be the same`);
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        phoneCountryCode: data.phoneCountryCode,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        isReturningStudent: data.isReturningStudent || false,
        parentEmail: data.parentEmail,
        parentPhone: data.parentPhone,
        parentPhoneCountryCode: data.parentPhoneCountryCode,
      },
      include: {
        enrollments: {
          include: {
            class: true,
            program: true,
          },
        },
        courseHistory: true,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create student', details: errorMessage },
      { status: 500 }
    );
  }
}
