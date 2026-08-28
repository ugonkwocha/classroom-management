import prisma from '@/lib/prisma';
import { requireTutorProfile } from '@/lib/access-control';

export async function getTutorDashboard(userId: string) {
  const tutorProfile = await requireTutorProfile(userId);
  const teacher = await prisma.teacher.findUnique({
    where: { id: tutorProfile.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      classes: {
        where: { isArchived: false },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          schedule: true,
          slot: true,
          batch: true,
          meetLink: true,
          course: { select: { id: true, name: true } },
          program: { select: { id: true, name: true, season: true, year: true } },
          _count: { select: { sessions: true } },
          enrollments: {
            where: { status: 'ASSIGNED' },
            orderBy: { student: { firstName: 'asc' } },
            select: {
              id: true,
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  isReturningStudent: true,
                },
              },
            },
          },
          sessions: {
            orderBy: { heldAt: 'desc' },
            take: 12,
            select: {
              id: true,
              heldAt: true,
              title: true,
              topics: true,
              summary: true,
              homework: true,
              status: true,
              parentVisible: true,
              createdAt: true,
              attendance: {
                select: { studentId: true, status: true, notes: true },
              },
              progressUpdates: {
                select: {
                  studentId: true,
                  rating: true,
                  summary: true,
                  strengths: true,
                  focusAreas: true,
                  parentVisible: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!teacher) return null;
  return buildTutorDashboardViewModel(teacher);
}

export function buildTutorDashboardViewModel(teacher: any) {
  const classes = teacher.classes.map((classRecord: any) => ({
    id: classRecord.id,
    name: classRecord.name,
    schedule: classRecord.schedule,
    slot: classRecord.slot,
    batch: classRecord.batch,
    meetLink: classRecord.meetLink,
    course: classRecord.course,
    program: classRecord.program,
    sessionCount: classRecord._count.sessions,
    roster: classRecord.enrollments.map((enrollment: any) => ({
      enrollmentId: enrollment.id,
      id: enrollment.student.id,
      firstName: enrollment.student.firstName,
      lastName: enrollment.student.lastName,
      isReturningStudent: enrollment.student.isReturningStudent,
    })),
    sessions: classRecord.sessions.map((session: any) => ({
      ...session,
      heldAt: session.heldAt instanceof Date ? session.heldAt.toISOString() : session.heldAt,
      createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
    })),
  }));

  const uniqueStudentIds = new Set(
    classes.flatMap((classRecord: any) => classRecord.roster.map((student: any) => student.id))
  );

  return {
    tutor: {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      status: teacher.status,
    },
    summary: {
      classCount: classes.length,
      studentCount: uniqueStudentIds.size,
      recordedSessionCount: classes.reduce(
        (total: number, classRecord: any) => total + classRecord.sessionCount,
        0
      ),
      classesWithoutSessionCount: classes.filter((classRecord: any) => classRecord.sessionCount === 0).length,
    },
    classes,
  };
}
