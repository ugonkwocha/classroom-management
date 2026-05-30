import type { Class } from '@/types';

type ClassScheduleCandidate = Pick<Class, 'id' | 'teacherId' | 'programId' | 'batch' | 'slot' | 'isArchived'> & {
  name?: string;
};

export function normalizeClassSlot(slot?: string | null) {
  return (slot || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function hasSameClassSchedule(a: ClassScheduleCandidate, b: ClassScheduleCandidate) {
  return (
    a.programId === b.programId &&
    Number(a.batch) === Number(b.batch) &&
    normalizeClassSlot(a.slot) === normalizeClassSlot(b.slot)
  );
}

export function findTeacherScheduleConflict(
  classes: ClassScheduleCandidate[],
  candidate: ClassScheduleCandidate,
  excludeClassId?: string
) {
  if (!candidate.teacherId || candidate.isArchived) return undefined;

  return classes.find(
    (classItem) =>
      !classItem.isArchived &&
      classItem.teacherId === candidate.teacherId &&
      classItem.id !== excludeClassId &&
      hasSameClassSchedule(classItem, candidate)
  );
}
