import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { sendEnrollmentAssignmentNotification } from '@/lib/enrollment-notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.RESEND_EMAIL);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const log = await prisma.emailLog.findUnique({ where: { id } });

    if (!log) {
      return NextResponse.json({ error: 'Email log not found' }, { status: 404 });
    }

    if (log.eventType !== 'CLASS_ASSIGNMENT' && log.eventType !== 'PREPARATION_INSTRUCTIONS') {
      return NextResponse.json(
        { error: 'Only class assignment and preparation instruction emails can be resent from this screen for now' },
        { status: 400 }
      );
    }

    if (!log.studentId || !log.classId) {
      return NextResponse.json(
        { error: 'This email log is missing the student or class reference required for resend' },
        { status: 400 }
      );
    }

    const notification = await sendEnrollmentAssignmentNotification(log.studentId, log.classId, {
      enrollmentId: log.enrollmentId,
      triggeredById: sessionUser.userId,
      resendOfLogId: log.id,
      recipientEmail: log.recipientEmail,
      mode: log.eventType === 'PREPARATION_INSTRUCTIONS' ? 'preparation-only' : 'class-details-only',
    });

    if (notification.success) {
      const existingPayload =
        log.payload && typeof log.payload === 'object' && !Array.isArray(log.payload)
          ? (log.payload as Record<string, unknown>)
          : {};

      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          error: null,
          sentAt: new Date(),
          payload: {
            ...existingPayload,
            resolvedByResendAt: new Date().toISOString(),
          },
        },
      });
    }

    return NextResponse.json({ success: notification.success, notification });
  } catch (error) {
    console.error('Error resending email:', error);
    return NextResponse.json({ error: 'Failed to resend email' }, { status: 500 });
  }
}
