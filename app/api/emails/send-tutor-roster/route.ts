import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { sendTutorClassEmail } from '@/lib/email';
import { logEmailDelivery } from '@/lib/email-logs';
import { getTutorClassRoster } from '@/lib/tutor-roster';

interface SendTutorRosterRequest {
  classId: string;
}

export async function POST(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.RESEND_EMAIL);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { classId }: SendTutorRosterRequest = await request.json();

    if (!classId) {
      return NextResponse.json({ error: 'Class is required' }, { status: 400 });
    }

    const roster = await getTutorClassRoster(classId);

    if (!roster) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const { classData, studentNames } = roster;

    if (!classData.teacher) {
      return NextResponse.json(
        { error: 'Assign a tutor to this class before sending a roster update.' },
        { status: 400 }
      );
    }

    if (!classData.teacher.email) {
      return NextResponse.json(
        { error: 'The assigned tutor does not have an email address.' },
        { status: 400 }
      );
    }

    if (studentNames.length === 0) {
      return NextResponse.json(
        { error: 'There are no assigned students in this class to include in the roster.' },
        { status: 400 }
      );
    }

    const tutorName = `${classData.teacher.firstName} ${classData.teacher.lastName}`.trim();
    const sentOn = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const emailResults = await sendTutorClassEmail({
      recipients: [{ email: classData.teacher.email, name: tutorName }],
      className: classData.name,
      courseName: classData.course.name,
      programName: classData.program.name,
      batch: classData.batch,
      slot: classData.slot,
      schedule: classData.schedule,
      tutorName,
      meetLink: classData.meetLink || undefined,
      assignedOn: sentOn,
      studentNames,
      emailType: 'roster_update',
    });
    const result = emailResults[0];

    await logEmailDelivery({
      eventType: 'TUTOR_ROSTER_UPDATE',
      recipientEmail: classData.teacher.email,
      recipientName: tutorName,
      recipientRole: 'teacher',
      subject: `Updated class roster: ${classData.name}`,
      provider: result?.provider,
      providerMessageId: result?.messageId,
      error: result?.error,
      success: Boolean(result?.success),
      classId: classData.id,
      triggeredById: sessionUser.userId,
      payload: {
        className: classData.name,
        courseName: classData.course.name,
        programName: classData.program.name,
        rosterCount: studentNames.length,
        studentNames,
        manuallyResent: true,
        providerFallbackError: result?.fallbackError || null,
        attemptedProviders: result?.attemptedProviders || [],
      },
    });

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          error: result?.error || 'Failed to send the tutor roster update.',
          rosterCount: studentNames.length,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      tutorName,
      tutorEmail: classData.teacher.email,
      rosterCount: studentNames.length,
      provider: result.provider,
    });
  } catch (error) {
    console.error('Error sending tutor roster update:', error);
    return NextResponse.json(
      { error: 'Failed to send the tutor roster update.' },
      { status: 500 }
    );
  }
}
