import prisma from '@/lib/prisma';
import type { RoleSlug, UserRole } from '@/types';

export const ROLE_SLUGS: RoleSlug[] = [
  'superadmin',
  'admin',
  'staff',
  'parent',
  'tutor',
  'student',
];

export const INTERNAL_ROLE_SLUGS: RoleSlug[] = ['superadmin', 'admin', 'staff'];

type AccessErrorCode = 'FORBIDDEN' | 'NOT_FOUND';

export class AccessDeniedError extends Error {
  readonly code: AccessErrorCode;
  readonly status: 403 | 404;

  constructor(message = 'You do not have access to this resource', code: AccessErrorCode = 'FORBIDDEN') {
    super(message);
    this.name = 'AccessDeniedError';
    this.code = code;
    this.status = code === 'NOT_FOUND' ? 404 : 403;
  }
}

type QueryDelegate = {
  findUnique: (args: any) => Promise<any>;
};

type FindFirstDelegate = {
  findFirst: (args: any) => Promise<any>;
};

type FindManyDelegate = {
  findMany: (args: any) => Promise<any[]>;
};

export interface PortalAccessDataSource {
  user: QueryDelegate;
  userRoleAssignment: FindManyDelegate;
  parentGuardian: FindFirstDelegate;
  teacher: FindFirstDelegate;
  student: QueryDelegate;
  class: FindFirstDelegate;
  programEnrollment: FindFirstDelegate;
}

const defaultDataSource: PortalAccessDataSource = {
  user: {
    findUnique: (args) => prisma.user.findUnique(args),
  },
  userRoleAssignment: {
    findMany: (args) => prisma.userRoleAssignment.findMany(args),
  },
  parentGuardian: {
    findFirst: (args) => prisma.parentGuardian.findFirst(args),
  },
  teacher: {
    findFirst: (args) => prisma.teacher.findFirst(args),
  },
  student: {
    findUnique: (args) => prisma.student.findUnique(args),
  },
  class: {
    findFirst: (args) => prisma.class.findFirst(args),
  },
  programEnrollment: {
    findFirst: (args) => prisma.programEnrollment.findFirst(args),
  },
};

export function legacyRoleToSlug(role: UserRole): RoleSlug {
  return role.toLowerCase() as RoleSlug;
}

export function isRoleSlug(value: string): value is RoleSlug {
  return ROLE_SLUGS.includes(value as RoleSlug);
}

export function mergeRoleSlugs(
  assignedRoleSlugs: string[],
  legacyRole?: UserRole | null
): RoleSlug[] {
  const roleSlugs = new Set<RoleSlug>();

  for (const roleSlug of assignedRoleSlugs) {
    if (isRoleSlug(roleSlug)) roleSlugs.add(roleSlug);
  }

  if (legacyRole) roleSlugs.add(legacyRoleToSlug(legacyRole));

  return ROLE_SLUGS.filter((roleSlug) => roleSlugs.has(roleSlug));
}

export function hasInternalRole(roleSlugs: RoleSlug[]): boolean {
  return roleSlugs.some((roleSlug) => INTERNAL_ROLE_SLUGS.includes(roleSlug));
}

export async function getUserRoleSlugs(
  userId: string,
  source: PortalAccessDataSource = defaultDataSource
): Promise<RoleSlug[]> {
  const [user, assignments] = await Promise.all([
    source.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    }),
    source.userRoleAssignment.findMany({
      where: { userId },
      select: { roleSlug: true },
    }),
  ]);

  if (!user?.isActive) return [];

  return mergeRoleSlugs(
    assignments.map((assignment) => assignment.roleSlug),
    user.role as UserRole
  );
}

export async function requireAnyRole(
  userId: string,
  allowedRoles: RoleSlug[],
  source: PortalAccessDataSource = defaultDataSource
): Promise<RoleSlug[]> {
  const roleSlugs = await getUserRoleSlugs(userId, source);

  if (!roleSlugs.some((roleSlug) => allowedRoles.includes(roleSlug))) {
    throw new AccessDeniedError();
  }

  return roleSlugs;
}

export async function requireParentGuardian(
  userId: string,
  familyId?: string,
  source: PortalAccessDataSource = defaultDataSource
) {
  await requireAnyRole(userId, ['parent'], source);

  const guardian = await source.parentGuardian.findFirst({
    where: {
      userId,
      isActive: true,
      ...(familyId ? { familyId } : {}),
      family: { isArchived: false },
    },
    select: {
      id: true,
      familyId: true,
      isPrimary: true,
    },
  });

  if (!guardian) {
    throw new AccessDeniedError('Family access was not found', 'NOT_FOUND');
  }

  return guardian;
}

export async function requireFamilyAccess(
  userId: string,
  familyId: string,
  source: PortalAccessDataSource = defaultDataSource
) {
  const roleSlugs = await getUserRoleSlugs(userId, source);

  if (hasInternalRole(roleSlugs)) {
    return { scope: 'internal' as const, roleSlugs };
  }

  const guardian = await requireParentGuardian(userId, familyId, source);
  return { scope: 'parent' as const, roleSlugs, guardian };
}

export async function requireTutorProfile(
  userId: string,
  source: PortalAccessDataSource = defaultDataSource
) {
  await requireAnyRole(userId, ['tutor'], source);

  const teacher = await source.teacher.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      userId: true,
      status: true,
    },
  });

  if (!teacher) {
    throw new AccessDeniedError('Active tutor access was not found', 'NOT_FOUND');
  }

  return teacher;
}

export async function requireTutorClassAccess(
  userId: string,
  classId: string,
  source: PortalAccessDataSource = defaultDataSource
) {
  const roleSlugs = await getUserRoleSlugs(userId, source);

  if (hasInternalRole(roleSlugs)) {
    const classRecord = await source.class.findFirst({
      where: { id: classId },
      select: { id: true, teacherId: true, isArchived: true },
    });

    if (!classRecord) throw new AccessDeniedError('Class was not found', 'NOT_FOUND');
    return { scope: 'internal' as const, roleSlugs, classRecord };
  }

  const teacher = await requireTutorProfile(userId, source);
  const classRecord = await source.class.findFirst({
    where: {
      id: classId,
      teacherId: teacher.id,
      isArchived: false,
    },
    select: { id: true, teacherId: true, isArchived: true },
  });

  if (!classRecord) {
    throw new AccessDeniedError('Assigned class access was not found', 'NOT_FOUND');
  }

  return { scope: 'tutor' as const, roleSlugs, teacher, classRecord };
}

export async function requireTutorStudentAccess(
  userId: string,
  studentId: string,
  source: PortalAccessDataSource = defaultDataSource
) {
  const roleSlugs = await getUserRoleSlugs(userId, source);

  if (hasInternalRole(roleSlugs)) {
    const student = await source.student.findUnique({
      where: { id: studentId },
      select: { id: true, familyId: true },
    });

    if (!student) throw new AccessDeniedError('Student was not found', 'NOT_FOUND');
    return { scope: 'internal' as const, roleSlugs, student };
  }

  const teacher = await requireTutorProfile(userId, source);
  const enrollment = await source.programEnrollment.findFirst({
    where: {
      studentId,
      status: 'ASSIGNED',
      class: {
        is: {
          teacherId: teacher.id,
          isArchived: false,
        },
      },
    },
    select: { id: true, studentId: true, classId: true },
  });

  if (!enrollment) {
    throw new AccessDeniedError('Assigned student access was not found', 'NOT_FOUND');
  }

  return { scope: 'tutor' as const, roleSlugs, teacher, enrollment };
}

export async function requireStudentAccess(
  userId: string,
  studentId: string,
  source: PortalAccessDataSource = defaultDataSource
) {
  const roleSlugs = await getUserRoleSlugs(userId, source);
  const student = await source.student.findUnique({
    where: { id: studentId },
    select: { id: true, familyId: true },
  });

  if (!student) throw new AccessDeniedError('Student was not found', 'NOT_FOUND');

  if (hasInternalRole(roleSlugs)) {
    return { scope: 'internal' as const, roleSlugs, student };
  }

  if (roleSlugs.includes('parent') && student.familyId) {
    const guardian = await requireParentGuardian(userId, student.familyId, source);
    return { scope: 'parent' as const, roleSlugs, student, guardian };
  }

  if (roleSlugs.includes('tutor')) {
    const tutorAccess = await requireTutorStudentAccess(userId, studentId, source);
    return { ...tutorAccess, student };
  }

  throw new AccessDeniedError('Student access was not found', 'NOT_FOUND');
}
