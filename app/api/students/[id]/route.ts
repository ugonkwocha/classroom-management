import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const student = await prisma.student.findUnique({
      where: { id: params.id },
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

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = getSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_STUDENT);
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

    // Get the current student to check for changes
    const currentStudent = await prisma.student.findUnique({
      where: { id: params.id },
    });

    if (!currentStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Validate uniqueness for email, phone, parentEmail, and parentPhone
    const validationErrors: string[] = [];

    // Only check email if it's being changed
    if (data.email && data.email !== currentStudent.email) {
      const existingEmail = await prisma.student.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        validationErrors.push(`Email "${data.email}" is already in use by another student`);
      }
    }

    // Only check phone if it's being changed
    if (data.phone && data.phone !== currentStudent.phone) {
      const existingPhone = await prisma.student.findFirst({
        where: { phone: data.phone },
      });
      if (existingPhone) {
        validationErrors.push(`Phone number "${data.phone}" is already in use by another student`);
      }
    }

    // Only check parentEmail if it's being changed
    if (data.parentEmail && data.parentEmail !== currentStudent.parentEmail) {
      const existingParentEmail = await prisma.student.findFirst({
        where: { parentEmail: data.parentEmail },
      });
      if (existingParentEmail) {
        validationErrors.push(`Parent email "${data.parentEmail}" is already in use by another student's parent`);
      }
    }

    // Only check parentPhone if it's being changed
    if (data.parentPhone && data.parentPhone !== currentStudent.parentPhone) {
      const existingParentPhone = await prisma.student.findFirst({
        where: { parentPhone: data.parentPhone },
      });
      if (existingParentPhone) {
        validationErrors.push(`Parent phone number "${data.parentPhone}" is already in use by another student's parent`);
      }
    }

    // Cross-validation: Student and parent shouldn't have the same email or phone
    const effectiveEmail = data.email !== undefined ? data.email : currentStudent.email;
    const effectiveParentEmail = data.parentEmail !== undefined ? data.parentEmail : currentStudent.parentEmail;
    const effectivePhone = data.phone !== undefined ? data.phone : currentStudent.phone;
    const effectiveParentPhone = data.parentPhone !== undefined ? data.parentPhone : currentStudent.parentPhone;

    if (effectiveEmail && effectiveParentEmail && effectiveEmail.toLowerCase() === effectiveParentEmail.toLowerCase()) {
      validationErrors.push(`Student email and parent email cannot be the same`);
    }

    if (effectivePhone && effectiveParentPhone && effectivePhone === effectiveParentPhone) {
      validationErrors.push(`Student phone and parent phone cannot be the same`);
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    const student = await prisma.student.update({
      where: { id: params.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        phoneCountryCode: data.phoneCountryCode,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        isReturningStudent: data.isReturningStudent,
        parentEmail: data.parentEmail,
        parentPhone: data.parentPhone,
        parentPhoneCountryCode: data.parentPhoneCountryCode,
        paymentStatus: data.paymentStatus,
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

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = getSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.DELETE_STUDENT);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    await prisma.student.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
