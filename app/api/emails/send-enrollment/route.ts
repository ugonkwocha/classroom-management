import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { sendEnrollmentAssignmentNotification } from '@/lib/enrollment-notifications';

interface SendEnrollmentEmailRequest {
  studentId: string;
  classId: string;
  enrollmentId?: string;
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
    checkPermission(sessionUser.role, PERMISSIONS.RESEND_EMAIL);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const { studentId, classId, enrollmentId }: SendEnrollmentEmailRequest = await request.json();

    if (!studentId || !classId) {
      return NextResponse.json(
        { error: 'Student and class are required' },
        { status: 400 }
      );
    }

    const assignedEnrollment = enrollmentId
      ? await prisma.programEnrollment.findFirst({
          where: {
            id: enrollmentId,
            studentId,
            classId,
            status: 'ASSIGNED',
          },
        })
      : await prisma.programEnrollment.findFirst({
          where: {
            studentId,
            classId,
            status: 'ASSIGNED',
          },
          orderBy: {
            enrollmentDate: 'desc',
          },
        });

    if (!assignedEnrollment) {
      return NextResponse.json(
        { error: 'This student is not actively assigned to the selected class.' },
        { status: 400 }
      );
    }

    const notification = await sendEnrollmentAssignmentNotification(studentId, classId, {
      enrollmentId: assignedEnrollment.id,
      triggeredById: sessionUser.userId,
      manualResend: true,
    });

    return NextResponse.json({
      success: notification.success,
      parentsSent: notification.emailsSent.parents,
      studentsSent: notification.emailsSent.students,
      parentsFailed: notification.emailsFailed.parents,
      studentsFailed: notification.emailsFailed.students,
      ...notification,
    });
  } catch (error) {
    console.error('Error sending enrollment emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
