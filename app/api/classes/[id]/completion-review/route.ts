import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

type DecisionInput = { studentId: string; enrollmentId: string; outcome: 'COMPLETED' | 'NOT_COMPLETED'; reason?: string };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.REVIEW_CLASS_COMPLETION); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id: classId } = await params;
  const body = await request.json();
  const decisions: DecisionInput[] = Array.isArray(body.decisions) ? body.decisions : [];
  if (decisions.length === 0) return NextResponse.json({ error: 'Select at least one completion outcome' }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      const classData = await tx.class.findUnique({ where: { id: classId }, include: { course: true, program: true } });
      if (!classData) throw new Error('Class not found');
      for (const item of decisions) {
        const enrollment = await tx.programEnrollment.findUnique({ where: { id: item.enrollmentId } });
        if (!enrollment || enrollment.studentId !== item.studentId || enrollment.programId !== classData.programId) throw new Error('Enrollment does not match this student and class');
        const previous = await tx.classCompletionDecision.findUnique({ where: { classId_studentId: { classId, studentId: item.studentId } } });
        if (!previous && enrollment.classId !== classId) throw new Error('Student is not assigned to this class');
        if (previous && previous.outcome !== item.outcome) {
          const activeCertificate = await tx.studentCertificate.findFirst({ where: { classId, studentId: item.studentId, status: 'ISSUED' } });
          if (activeCertificate) throw new Error('Revoke the issued certificate before changing this completion outcome');
        }

        await tx.classCompletionDecision.upsert({
          where: { classId_studentId: { classId, studentId: item.studentId } },
          create: { classId, studentId: item.studentId, enrollmentId: item.enrollmentId, outcome: item.outcome, reason: item.reason?.trim() || null, reviewedById: user.userId },
          update: { enrollmentId: item.enrollmentId, outcome: item.outcome, reason: item.reason?.trim() || null, reviewedById: user.userId, reviewedAt: new Date() },
        });
        await tx.programEnrollment.update({ where: { id: item.enrollmentId }, data: { status: item.outcome === 'COMPLETED' ? 'COMPLETED' : 'DROPPED', classId: null } });
        if (item.outcome === 'COMPLETED') {
          const history = await tx.courseHistory.findFirst({
            where: {
              studentId: item.studentId,
              courseId: classData.courseId,
              programId: classData.programId,
              batch: classData.batch,
              completionStatus: 'IN_PROGRESS',
            },
          });
          if (history) await tx.courseHistory.update({ where: { id: history.id }, data: { completionStatus: 'COMPLETED', endDate: new Date() } });
          else await tx.courseHistory.create({ data: { studentId: item.studentId, courseId: classData.courseId, courseName: classData.course.name, programId: classData.programId, programName: classData.program.name, batch: classData.batch, year: classData.program.year, completionStatus: 'COMPLETED', endDate: new Date() } });
        } else {
          await tx.courseHistory.deleteMany({
            where: {
              studentId: item.studentId,
              courseId: classData.courseId,
              programId: classData.programId,
              batch: classData.batch,
              completionStatus: 'IN_PROGRESS',
            },
          });
        }
        await tx.class.update({ where: { id: classId }, data: { students: { set: classData.students.filter((studentId) => studentId !== item.studentId) } } });
        classData.students = classData.students.filter((studentId) => studentId !== item.studentId);
      }
    });
    return NextResponse.json({ success: true, reviewed: decisions.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save completion review' }, { status: 400 });
  }
}
