import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { sendClassAssignmentEmail } from '@/lib/email';
import prisma from '@/lib/prisma';
import { logEmailDelivery } from '@/lib/email-logs';

interface SendTeacherAssignmentEmailRequest {
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
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_CLASS);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    const { classId }: SendTeacherAssignmentEmailRequest = await request.json();

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: true,
        program: true,
        teacher: true,
      },
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    if (!classData.teacher?.email) {
      return NextResponse.json({
        success: true,
        emailsSent: { teachers: 0 },
      });
    }

    const enrollmentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailResults = await sendClassAssignmentEmail({
      recipients: [
        {
          email: classData.teacher.email,
          name: `${classData.teacher.firstName} ${classData.teacher.lastName}`,
        },
      ],
      className: classData.name,
      courseName: classData.course.name,
      programName: classData.program.name,
      batch: classData.batch,
      slot: classData.slot,
      schedule: classData.schedule,
      instructorName: classData.teacher.firstName,
      meetLink: classData.meetLink || undefined,
      enrollmentDate,
      recipientType: 'teacher',
    });

    const successfulTeacherEmails = emailResults.filter((result) => result.success).length;
    const failedTeacherEmails = emailResults.filter((result) => !result.success).length;
    const result = emailResults[0];

    await logEmailDelivery({
      eventType: 'TEACHER_ASSIGNMENT',
      recipientEmail: classData.teacher.email,
      recipientName: `${classData.teacher.firstName} ${classData.teacher.lastName}`,
      recipientRole: 'teacher',
      subject: `Tutor assignment: ${classData.name}`,
      providerMessageId: result?.messageId,
      error: result?.error,
      success: Boolean(result?.success),
      classId: classData.id,
      triggeredById: sessionUser.userId,
      payload: {
        className: classData.name,
        courseName: classData.course.name,
        programName: classData.program.name,
      },
    });

    return NextResponse.json({
      success: true,
      emailsSent: { teachers: successfulTeacherEmails },
      emailsFailed: { teachers: failedTeacherEmails },
    });
  } catch (error) {
    console.error('Error sending tutor assignment email:', error);
    return NextResponse.json(
      { error: 'Failed to send tutor assignment email' },
      { status: 500 }
    );
  }
}
