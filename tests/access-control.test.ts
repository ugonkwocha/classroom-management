import { describe, expect, it, vi } from 'vitest';

import {
  AccessDeniedError,
  getUserRoleSlugs,
  mergeRoleSlugs,
  requireFamilyAccess,
  requireStudentAccess,
  requireTutorClassAccess,
  requireTutorSessionAccess,
  requireTutorStudentAccess,
  type PortalAccessDataSource,
} from '@/lib/access-control';

function createSource(overrides: Partial<PortalAccessDataSource> = {}): PortalAccessDataSource {
  return {
    user: {
      findUnique: vi.fn(async () => ({ role: 'STAFF', isActive: true })),
    },
    userRoleAssignment: {
      findMany: vi.fn(async () => []),
    },
    parentGuardian: {
      findFirst: vi.fn(async () => null),
    },
    teacher: {
      findFirst: vi.fn(async () => null),
    },
    student: {
      findUnique: vi.fn(async () => null),
    },
    class: {
      findFirst: vi.fn(async () => null),
    },
    classSession: {
      findFirst: vi.fn(async () => null),
    },
    programEnrollment: {
      findFirst: vi.fn(async () => null),
    },
    ...overrides,
  };
}

function roleSource(
  roleSlugs: string[],
  legacyRole: 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'PARENT' | 'TUTOR' | 'STUDENT' = 'STAFF'
) {
  return {
    user: {
      findUnique: vi.fn(async () => ({ role: legacyRole, isActive: true })),
    },
    userRoleAssignment: {
      findMany: vi.fn(async () => roleSlugs.map((roleSlug) => ({ roleSlug }))),
    },
  };
}

describe('role compatibility', () => {
  it('merges additive roles with the legacy staff role without duplicates', () => {
    expect(mergeRoleSlugs(['parent', 'staff', 'unknown'], 'STAFF')).toEqual(['staff', 'parent']);
  });

  it('keeps the legacy role available when no assignment row exists yet', async () => {
    const source = createSource();

    await expect(getUserRoleSlugs('staff-1', source)).resolves.toEqual(['staff']);
  });

  it('returns no roles for an inactive account', async () => {
    const source = createSource({
      user: {
        findUnique: vi.fn(async () => ({ role: 'ADMIN', isActive: false })),
      },
    });

    await expect(getUserRoleSlugs('inactive-1', source)).resolves.toEqual([]);
  });
});

describe('family and student boundaries', () => {
  it('allows an active parent to access only a linked family', async () => {
    const source = createSource({
      ...roleSource(['parent'], 'PARENT'),
      parentGuardian: {
        findFirst: vi.fn(async (args) => args.where.familyId === 'family-1'
          ? { id: 'guardian-1', familyId: 'family-1', isPrimary: true }
          : null),
      },
    });

    await expect(requireFamilyAccess('parent-1', 'family-1', source)).resolves.toMatchObject({
      scope: 'parent',
      guardian: { familyId: 'family-1' },
    });

    await expect(requireFamilyAccess('parent-1', 'family-2', source)).rejects.toMatchObject({
      name: 'AccessDeniedError',
      status: 404,
    });
  });

  it('allows internal staff to access a family without a guardian link', async () => {
    const source = createSource({
      ...roleSource(['admin'], 'ADMIN'),
    });

    await expect(requireFamilyAccess('admin-1', 'family-1', source)).resolves.toMatchObject({
      scope: 'internal',
    });
    expect(source.parentGuardian.findFirst).not.toHaveBeenCalled();
  });

  it('allows a parent to access a student in the linked family and hides another family', async () => {
    const source = createSource({
      ...roleSource(['parent'], 'PARENT'),
      student: {
        findUnique: vi.fn(async (args) => ({
          id: args.where.id,
          familyId: args.where.id === 'student-1' ? 'family-1' : 'family-2',
        })),
      },
      parentGuardian: {
        findFirst: vi.fn(async (args) => args.where.familyId === 'family-1'
          ? { id: 'guardian-1', familyId: 'family-1', isPrimary: true }
          : null),
      },
    });

    await expect(requireStudentAccess('parent-1', 'student-1', source)).resolves.toMatchObject({
      scope: 'parent',
      student: { id: 'student-1' },
    });

    await expect(requireStudentAccess('parent-1', 'student-2', source)).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe('tutor assignment boundaries', () => {
  it('allows a tutor to access only an assigned active class', async () => {
    const source = createSource({
      ...roleSource(['tutor'], 'TUTOR'),
      teacher: {
        findFirst: vi.fn(async () => ({ id: 'teacher-1', userId: 'tutor-1', status: 'ACTIVE' })),
      },
      class: {
        findFirst: vi.fn(async (args) => args.where.id === 'class-1' && args.where.teacherId === 'teacher-1'
          ? { id: 'class-1', teacherId: 'teacher-1', isArchived: false }
          : null),
      },
    });

    await expect(requireTutorClassAccess('tutor-1', 'class-1', source)).resolves.toMatchObject({
      scope: 'tutor',
      classRecord: { id: 'class-1' },
    });

    await expect(requireTutorClassAccess('tutor-1', 'class-2', source)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('allows a tutor to access only students assigned to their class', async () => {
    const source = createSource({
      ...roleSource(['tutor'], 'TUTOR'),
      teacher: {
        findFirst: vi.fn(async () => ({ id: 'teacher-1', userId: 'tutor-1', status: 'ACTIVE' })),
      },
      programEnrollment: {
        findFirst: vi.fn(async (args) => args.where.studentId === 'student-1'
          ? { id: 'enrollment-1', studentId: 'student-1', classId: 'class-1' }
          : null),
      },
    });

    await expect(requireTutorStudentAccess('tutor-1', 'student-1', source)).resolves.toMatchObject({
      scope: 'tutor',
      enrollment: { studentId: 'student-1' },
    });

    await expect(requireTutorStudentAccess('tutor-1', 'student-2', source)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('allows a tutor to update only sessions in an assigned active class', async () => {
    const source = createSource({
      ...roleSource(['tutor'], 'TUTOR'),
      teacher: {
        findFirst: vi.fn(async () => ({ id: 'teacher-1', userId: 'tutor-1', status: 'ACTIVE' })),
      },
      classSession: {
        findFirst: vi.fn(async (args) =>
          args.where.id === 'session-1' && args.where.class.teacherId === 'teacher-1'
            ? { id: 'session-1', classId: 'class-1', recordedById: 'tutor-1' }
            : null
        ),
      },
    });

    await expect(requireTutorSessionAccess('tutor-1', 'session-1', source)).resolves.toMatchObject({
      scope: 'tutor',
      session: { classId: 'class-1' },
    });
    await expect(requireTutorSessionAccess('tutor-1', 'session-2', source)).rejects.toMatchObject({
      status: 404,
    });
  });
});
