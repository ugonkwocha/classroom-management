import prisma from '@/lib/prisma';
import { AccessDeniedError, requireAnyRole } from '@/lib/access-control';

type ParentDashboardDataSource = {
  parentGuardian: {
    findMany: (args: any) => Promise<any[]>;
  };
};

const defaultSource: ParentDashboardDataSource = {
  parentGuardian: {
    findMany: (args) => prisma.parentGuardian.findMany(args),
  },
};

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function distinctClassSlot(schedule: string, slot: string): string | null {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalize(schedule) === normalize(slot) ? null : slot;
}

export async function getParentDashboard(
  userId: string,
  source: ParentDashboardDataSource = defaultSource
) {
  await requireAnyRole(userId, ['parent']);

  const guardianProfiles = await source.parentGuardian.findMany({
    where: {
      userId,
      isActive: true,
      needsReview: false,
      family: { isArchived: false },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      relationship: true,
      isPrimary: true,
      family: {
        select: {
          id: true,
          displayName: true,
          guardians: {
            where: { isActive: true },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              relationship: true,
              isPrimary: true,
            },
            orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
          },
          students: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              isReturningStudent: true,
              enrollments: {
                where: { status: { not: 'DROPPED' } },
                select: {
                  id: true,
                  batchNumber: true,
                  enrollmentDate: true,
                  status: true,
                  paymentStatus: true,
                  paymentRecords: {
                    select: {
                      amountConfirmed: true,
                      createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                  },
                  program: {
                    select: {
                      id: true,
                      name: true,
                      season: true,
                      year: true,
                      startDate: true,
                    },
                  },
                  class: {
                    select: {
                      id: true,
                      name: true,
                      schedule: true,
                      slot: true,
                      meetLink: true,
                      isArchived: true,
                      course: { select: { id: true, name: true } },
                      teacher: { select: { firstName: true, lastName: true } },
                    },
                  },
                },
                orderBy: { enrollmentDate: 'desc' },
              },
            },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
          },
        },
      },
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });

  if (guardianProfiles.length === 0) {
    throw new AccessDeniedError('Linked family access was not found', 'NOT_FOUND');
  }

  return buildParentDashboardViewModel(guardianProfiles);
}

export function buildParentDashboardViewModel(guardianProfiles: any[]) {
  const familyMap = new Map<string, any>();
  for (const profile of guardianProfiles) {
    if (!familyMap.has(profile.family.id)) {
      familyMap.set(profile.family.id, profile.family);
    }
  }

  const families = Array.from(familyMap.values()).map((family) => ({
    id: family.id,
    displayName: family.displayName,
    guardians: family.guardians.map((guardian: any) => ({
      id: guardian.id,
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      relationship: guardian.relationship,
      isPrimary: guardian.isPrimary,
    })),
    children: family.students.map((student: any) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      isReturningStudent: student.isReturningStudent,
      enrollments: student.enrollments.map((enrollment: any) => ({
        id: enrollment.id,
        batchNumber: enrollment.batchNumber,
        enrollmentDate: iso(enrollment.enrollmentDate),
        status: enrollment.status,
        paymentStatus: enrollment.paymentStatus,
        confirmedAmount: enrollment.paymentRecords.reduce(
          (total: number, payment: any) => total + payment.amountConfirmed,
          0
        ),
        lastPaymentConfirmedAt: iso(enrollment.paymentRecords[0]?.createdAt),
        program: {
          id: enrollment.program.id,
          name: enrollment.program.name,
          season: enrollment.program.season,
          year: enrollment.program.year,
          startDate: iso(enrollment.program.startDate),
        },
        class: enrollment.class
          ? {
              id: enrollment.class.id,
              name: enrollment.class.name,
              schedule: enrollment.class.schedule,
              slot: distinctClassSlot(enrollment.class.schedule, enrollment.class.slot),
              meetLink:
                enrollment.status === 'ASSIGNED' && !enrollment.class.isArchived
                  ? enrollment.class.meetLink
                  : null,
              course: enrollment.class.course,
              tutorName: enrollment.class.teacher
                ? `${enrollment.class.teacher.firstName} ${enrollment.class.teacher.lastName}`.trim()
                : null,
            }
          : null,
      })),
    })),
  }));

  const children = families.flatMap((family) => family.children);
  const enrollments = children.flatMap((child) => child.enrollments);

  return {
    guardian: {
      firstName: guardianProfiles[0].firstName,
      lastName: guardianProfiles[0].lastName,
    },
    summary: {
      familyCount: families.length,
      childCount: children.length,
      activeEnrollmentCount: enrollments.filter((item) => item.status === 'ASSIGNED' || item.status === 'WAITLIST').length,
      awaitingClassCount: enrollments.filter(
        (item) => (item.status === 'WAITLIST' || item.status === 'ASSIGNED') && !item.class
      ).length,
      pendingPaymentCount: enrollments.filter((item) => item.paymentStatus === 'PENDING').length,
    },
    families,
  };
}
