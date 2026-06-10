import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import {
  ensureFamilyForStudentInput,
  getPrimaryGuardian,
  primaryGuardianLegacyData,
  studentFamilyInclude,
} from '@/lib/family-server';
import { normalizePaymentStatus } from '@/lib/student-payment-status';

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
      where: { id: id },
      include: {
        ...studentFamilyInclude,
        enrollments: {
          include: {
            class: true,
            program: true,
            claimedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
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
      where: { id: id },
    });

    if (!currentStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Validate uniqueness for student-owned contact fields only. Parent contact
    // details can be shared by siblings.
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

    const student = await prisma.$transaction(async (tx) => {
      const shouldUpdateFamily = data.familyId || data.createFamily;
      const family = shouldUpdateFamily
        ? await ensureFamilyForStudentInput(data, tx as any)
        : currentStudent.familyId
          ? await tx.family.findUnique({
              where: { id: currentStudent.familyId },
              include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
            })
          : null;
      const primaryGuardian = getPrimaryGuardian(family);

      return tx.student.update({
        where: { id: id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          phoneCountryCode: data.phoneCountryCode,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          isReturningStudent: data.isReturningStudent,
          familyId: family?.id || currentStudent.familyId,
          ...(primaryGuardian
            ? primaryGuardianLegacyData(primaryGuardian)
            : {
                parentEmail: data.parentEmail,
                parentPhone: data.parentPhone,
                parentPhoneCountryCode: data.parentPhoneCountryCode,
              }),
          paymentStatus: data.paymentStatus ? normalizePaymentStatus(data.paymentStatus) : undefined,
        },
        include: {
          ...studentFamilyInclude,
          enrollments: {
            include: {
              class: true,
              program: true,
              claimedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
          courseHistory: true,
        },
      });
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
      where: { id: id },
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
