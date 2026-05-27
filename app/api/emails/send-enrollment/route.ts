import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { sendClassAssignmentEmail } from '@/lib/email';
import prisma from '@/lib/prisma';
import { formatGuardianName } from '@/lib/family-utils';

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
      include: {
        family: {
          include: {
            guardians: {
              orderBy: [
                { isPrimary: 'desc' },
                { createdAt: 'asc' },
              ],
            },
          },
        },
      },
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

    const primaryGuardian = student.family?.guardians.find((guardian) => guardian.isPrimary && guardian.isActive)
      || student.family?.guardians.find((guardian) => guardian.isActive)
      || student.family?.guardians[0];
    const parentRecipient = primaryGuardian?.email?.trim()
      ? [{ email: primaryGuardian.email, name: formatGuardianName(primaryGuardian.firstName, primaryGuardian.lastName) || 'Parent/Guardian' }]
      : student.parentEmail?.trim()
      ? [{ email: student.parentEmail, name: 'Parent/Guardian' }]
      : [];
    const studentRecipient = student.email?.trim()
      ? [{ email: student.email, name: `${student.firstName} ${student.lastName}`.trim() }]
      : [];
    const studentName = `${student.firstName} ${student.lastName}`.trim();

    // Format enrollment date
    const enrollmentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let parentEmailResults: Awaited<ReturnType<typeof sendClassAssignmentEmail>> = [];
    let studentEmailResults: Awaited<ReturnType<typeof sendClassAssignmentEmail>> = [];

    if (parentRecipient.length > 0) {
      parentEmailResults = await sendClassAssignmentEmail({
        recipients: parentRecipient,
        className: classData.name,
        courseName: classData.course.name,
        programName: classData.program.name,
        batch: classData.batch,
        slot: classData.slot,
        schedule: classData.schedule,
        instructorName: classData.teacher
          ? `${classData.teacher.firstName} ${classData.teacher.lastName}`
          : undefined,
        meetLink: classData.meetLink || undefined,
        enrollmentDate,
        recipientType: 'parent',
        studentName,
      });
    }

    if (studentRecipient.length > 0) {
      studentEmailResults = await sendClassAssignmentEmail({
        recipients: studentRecipient,
        className: classData.name,
        courseName: classData.course.name,
        programName: classData.program.name,
        batch: classData.batch,
        slot: classData.slot,
        schedule: classData.schedule,
        instructorName: classData.teacher
          ? `${classData.teacher.firstName} ${classData.teacher.lastName}`
          : undefined,
        meetLink: classData.meetLink || undefined,
        enrollmentDate,
        recipientType: 'student',
        studentName,
      });
    }

    const successfulParentEmails = parentEmailResults.filter((result) => result.success).length;
    const failedParentEmails = parentEmailResults.filter((result) => !result.success).length;
    const successfulStudentEmails = studentEmailResults.filter((result) => result.success).length;
    const failedStudentEmails = studentEmailResults.filter((result) => !result.success).length;

    return NextResponse.json({
      success: true,
      emailsSent: {
        parents: successfulParentEmails,
        students: successfulStudentEmails,
      },
      emailsFailed: {
        parents: failedParentEmails,
        students: failedStudentEmails,
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
