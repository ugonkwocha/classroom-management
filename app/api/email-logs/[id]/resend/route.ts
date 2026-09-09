import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { sendEnrollmentAssignmentNotification } from '@/lib/enrollment-notifications';
import { sendStoredCertificate } from '@/lib/certificate-service';
import { sendPaidEnrollmentConfirmation } from '@/lib/paid-enrollment-confirmation';

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

    if (log.eventType === 'CERTIFICATE_DELIVERY') {
      if (!log.certificateId) {
        return NextResponse.json({ error: 'This certificate log is missing its certificate reference' }, { status: 400 });
      }
      const notification = await sendStoredCertificate(log.certificateId, sessionUser.userId, request.nextUrl.origin);
      return NextResponse.json({ success: notification.success, notification });
    }

    if (log.eventType === 'PAID_ENROLLMENT_CONFIRMATION') {
      const payload = log.payload && typeof log.payload === 'object' && !Array.isArray(log.payload)
        ? log.payload as Record<string, unknown>
        : {};
      const importId = typeof payload.importId === 'string' ? payload.importId : null;
      if (!importId) {
        return NextResponse.json({ error: 'This confirmation log is missing its paid enrollment reference' }, { status: 400 });
      }
      const notification = await sendPaidEnrollmentConfirmation(importId, sessionUser.userId, { resendOfLogId: log.id });
      return NextResponse.json({ success: notification.success, notification });
    }

    if (log.eventType !== 'CLASS_ASSIGNMENT') {
      return NextResponse.json(
        { error: 'This email type cannot be resent from this screen' },
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
      manualResend: true,
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
