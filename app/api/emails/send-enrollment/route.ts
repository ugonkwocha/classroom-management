import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { sendClassAssignmentEmail, prepareClassAssignmentRecipients } from '@/lib/email';
import prisma from '@/lib/prisma';

interface SendEnrollmentEmailRequest {
  studentId: string;
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
    const { studentId, classId }: SendEnrollmentEmailRequest = await request.json();

    // Fetch student data
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Fetch class data with related course and program
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

    // Prepare recipients
    const recipients = prepareClassAssignmentRecipients(
      classData.teacher?.firstName && classData.teacher?.lastName
        ? `${classData.teacher.firstName} ${classData.teacher.lastName}`
        : undefined,
      classData.teacher?.email,
      `${student.firstName} ${student.lastName}`,
      student.email || undefined,
      student.parentEmail || undefined
    );

    // Format enrollment date
    const enrollmentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Send emails to teacher if assigned
    if (recipients.teachers.length > 0) {
      await sendClassAssignmentEmail({
        recipients: recipients.teachers,
        className: classData.name,
        courseName: classData.course.name,
        programName: classData.program.name,
        batch: classData.batch,
        slot: classData.slot,
        schedule: classData.schedule,
        instructorName: classData.teacher?.firstName,
        meetLink: classData.meetLink || undefined,
        enrollmentDate,
        recipientType: 'teacher',
      });
    }

    // Send emails to student if email available
    if (recipients.students.length > 0) {
      await sendClassAssignmentEmail({
        recipients: recipients.students,
        className: classData.name,
        courseName: classData.course.name,
        programName: classData.program.name,
        batch: classData.batch,
        slot: classData.slot,
        schedule: classData.schedule,
        instructorName: classData.teacher?.firstName,
        meetLink: classData.meetLink || undefined,
        enrollmentDate,
        recipientType: 'student',
      });
    }

    // Send emails to parent if email available
    if (recipients.parents.length > 0) {
      await sendClassAssignmentEmail({
        recipients: recipients.parents,
        className: classData.name,
        courseName: classData.course.name,
        programName: classData.program.name,
        batch: classData.batch,
        slot: classData.slot,
        schedule: classData.schedule,
        instructorName: classData.teacher?.firstName,
        meetLink: classData.meetLink || undefined,
        enrollmentDate,
        recipientType: 'parent',
      });
    }

    return NextResponse.json({
      success: true,
      emailsSent: {
        teachers: recipients.teachers.length,
        students: recipients.students.length,
        parents: recipients.parents.length,
      },
    });
  } catch (error) {
    console.error('Error sending enrollment emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
