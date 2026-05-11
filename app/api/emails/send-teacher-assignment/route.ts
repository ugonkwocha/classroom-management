import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { sendClassAssignmentEmail } from '@/lib/email';
import prisma from '@/lib/prisma';

interface SendTeacherAssignmentEmailRequest {
  classId: string;
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

    await sendClassAssignmentEmail({
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

    return NextResponse.json({
      success: true,
      emailsSent: { teachers: 1 },
    });
  } catch (error) {
    console.error('Error sending teacher assignment email:', error);
    return NextResponse.json(
      { error: 'Failed to send teacher assignment email' },
      { status: 500 }
    );
  }
}
