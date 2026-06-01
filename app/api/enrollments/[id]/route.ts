import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { normalizePaymentStatus } from '@/lib/student-payment-status';
import { sendEnrollmentAssignmentNotification } from '@/lib/enrollment-notifications';
import { ensureClassHasActivePreparationTemplate } from '@/lib/course-email-template-requirements';

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
    const enrollment = await prisma.programEnrollment.findUnique({
      where: { id: id },
      include: {
        student: true,
        program: true,
        class: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(enrollment);
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollment' },
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
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_ENROLLMENT);
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
    console.log('[PUT /api/enrollments/:id] Updating enrollment:', id, 'with data:', { classId: data.classId, batchNumber: data.batchNumber, status: data.status });

    let shouldSendAssignmentNotification = false;
    let notificationStudentId = '';
    let notificationClassId = '';

    const enrollment = await prisma.$transaction(async (tx) => {
      const currentEnrollment = await tx.programEnrollment.findUnique({
        where: { id: id },
      });

      if (!currentEnrollment) {
        throw new Error('Enrollment not found');
      }

      const nextClassId = Object.prototype.hasOwnProperty.call(data, 'classId')
        ? data.classId || null
        : currentEnrollment.classId;
      const nextBatchNumber = Object.prototype.hasOwnProperty.call(data, 'batchNumber')
        ? data.batchNumber
        : currentEnrollment.batchNumber;
      const nextStatus = Object.prototype.hasOwnProperty.call(data, 'status')
        ? data.status
        : currentEnrollment.status;
      const effectiveClassId = nextStatus === 'ASSIGNED' ? nextClassId : null;
      shouldSendAssignmentNotification = Boolean(
        effectiveClassId &&
        nextStatus === 'ASSIGNED' &&
        (currentEnrollment.classId !== effectiveClassId || currentEnrollment.status !== 'ASSIGNED')
      );
      notificationStudentId = currentEnrollment.studentId;
      notificationClassId = effectiveClassId || '';

      if (effectiveClassId) {
        const targetClass = await tx.class.findUnique({
          where: { id: effectiveClassId },
        });

        if (!targetClass) {
          throw new Error('Target class not found');
        }

        if (targetClass.isArchived) {
          throw new Error('Cannot assign students to an archived class');
        }

        if (targetClass.programId !== currentEnrollment.programId) {
          throw new Error('Selected class does not belong to this enrollment program');
        }

        if (targetClass.batch !== nextBatchNumber) {
          throw new Error('Selected class does not match this enrollment batch');
        }

        await ensureClassHasActivePreparationTemplate(tx, effectiveClassId);

        const assignedCount = await tx.programEnrollment.count({
          where: {
            id: { not: id },
            classId: effectiveClassId,
            status: 'ASSIGNED',
          },
        });

        if (assignedCount >= targetClass.capacity) {
          throw new Error('Selected class is already full');
        }
      }

      const updateData: any = {};
      if (Object.prototype.hasOwnProperty.call(data, 'batchNumber')) updateData.batchNumber = data.batchNumber;
      if (Object.prototype.hasOwnProperty.call(data, 'status')) updateData.status = data.status;
      if (Object.prototype.hasOwnProperty.call(data, 'paymentStatus')) updateData.paymentStatus = normalizePaymentStatus(data.paymentStatus);
      if (Object.prototype.hasOwnProperty.call(data, 'priceType')) updateData.priceType = data.priceType;
      if (Object.prototype.hasOwnProperty.call(data, 'priceAmount')) updateData.priceAmount = data.priceAmount;
      if (
        Object.prototype.hasOwnProperty.call(data, 'classId') ||
        (Object.prototype.hasOwnProperty.call(data, 'status') && data.status !== 'ASSIGNED')
      ) {
        updateData.classId = effectiveClassId;
      }

      const updatedEnrollment = await tx.programEnrollment.update({
        where: { id: id },
        data: updateData,
        include: {
          student: true,
          program: true,
          class: true,
        },
      });

      if (currentEnrollment.classId && currentEnrollment.classId !== updatedEnrollment.classId) {
        const oldClass = await tx.class.findUnique({
          where: { id: currentEnrollment.classId },
          select: { students: true },
        });

        if (oldClass) {
          await tx.class.update({
            where: { id: currentEnrollment.classId },
            data: {
              students: oldClass.students.filter((studentId) => studentId !== currentEnrollment.studentId),
            },
          });
        }
      }

      if (updatedEnrollment.classId) {
        const newClass = await tx.class.findUnique({
          where: { id: updatedEnrollment.classId },
          select: { students: true },
        });

        if (newClass && !newClass.students.includes(updatedEnrollment.studentId)) {
          await tx.class.update({
            where: { id: updatedEnrollment.classId },
            data: {
              students: [...newClass.students, updatedEnrollment.studentId],
            },
          });
        }
      }

      return updatedEnrollment;
    });

    console.log('[PUT /api/enrollments/:id] Updated enrollment. New classId:', enrollment.classId);
    let emailNotification = null;

    if (shouldSendAssignmentNotification && notificationStudentId && notificationClassId) {
      try {
        emailNotification = await sendEnrollmentAssignmentNotification(notificationStudentId, notificationClassId, {
          enrollmentId: enrollment.id,
          triggeredById: sessionUser.userId,
        });
      } catch (emailError) {
        console.error('[PUT /api/enrollments/:id] Assignment saved, but email notification failed:', emailError);
        emailNotification = {
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Email notification failed',
        };
      }
    }

    return NextResponse.json({
      ...enrollment,
      emailNotification,
    });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    const message = error instanceof Error ? error.message : 'Failed to update enrollment';
    const status = message === 'Enrollment not found' ? 404 : 400;
    return NextResponse.json(
      { error: message },
      { status }
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
    checkPermission(sessionUser.role, PERMISSIONS.DELETE_ENROLLMENT);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    await prisma.programEnrollment.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to delete enrollment' },
      { status: 500 }
    );
  }
}
