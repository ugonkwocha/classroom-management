import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/auth';
import { sendEnrollmentAssignmentNotification } from '@/lib/enrollment-notifications';

interface SendEnrollmentEmailRequest {
  studentId: string;
  classId: string;
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
    const { studentId, classId }: SendEnrollmentEmailRequest = await request.json();

    if (!studentId || !classId) {
      return NextResponse.json(
        { error: 'Student and class are required' },
        { status: 400 }
      );
    }

    const notification = await sendEnrollmentAssignmentNotification(studentId, classId, {
      triggeredById: sessionUser.userId,
    });

    return NextResponse.json({
      success: notification.success,
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
