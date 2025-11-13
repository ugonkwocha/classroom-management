import { Student, Class, WaitlistEntry } from '@/types';

export interface AssignmentResult {
  assigned: Array<{ studentId: string; classId: string }>;
  waitlisted: Array<{ studentId: string; programLevel: string }>;
}

export function assignStudentsToClasses(
  students: Student[],
  classes: Class[],
  existingWaitlist: WaitlistEntry[]
): AssignmentResult {
  const assigned: Array<{ studentId: string; classId: string }> = [];
  const waitlisted: Array<{ studentId: string; programLevel: string }> = [];

  // Get unassigned students (those with no assigned enrollments)
  const unassignedStudents = students.filter(
    (s) => !s.programEnrollments || s.programEnrollments.length === 0 ||
           s.programEnrollments.every((e) => e.status === 'waitlist')
  );

  // Sort students by priority (returning students first)
  const sortedStudents = unassignedStudents.sort((a, b) => {
    const priorityA = a.isReturningStudent ? 100 : 0;
    const priorityB = b.isReturningStudent ? 100 : 0;
    return priorityB - priorityA;
  });

  // Try to assign each student to any available class
  for (const student of sortedStudents) {
    try {
      // Find available classes (not at capacity)
      const availableClasses = classes.filter(
        (cls) => cls.students.length < cls.capacity
      );

      if (availableClasses.length > 0) {
        // Assign to the class with the most available capacity
        const selectedClass = availableClasses.reduce((prev, curr) => {
          const prevAvailable = prev.capacity - prev.students.length;
          const currAvailable = curr.capacity - curr.students.length;
          return currAvailable > prevAvailable ? curr : prev;
        });

        assigned.push({
          studentId: student.id,
          classId: selectedClass.id,
        });
      } else {
        // Add to waitlist if no space available
        const existingWaitlistEntry = existingWaitlist.find((w) => w.studentId === student.id);
        if (!existingWaitlistEntry) {
          // Use the first class's program level as a generic placeholder
          const programLevel = classes.length > 0 ? classes[0].programLevel : 'AI Explorers';
          waitlisted.push({
            studentId: student.id,
            programLevel,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to assign student ${student.id}:`, error);
    }
  }

  return { assigned, waitlisted };
}

export function calculateWaitlistPriority(
  student: Student,
  existingWaitlistEntry: WaitlistEntry | undefined,
  waitlistEntries: WaitlistEntry[]
): number {
  let priority = 0;

  // Returning students get higher priority
  if (student.isReturningStudent) priority += 100;

  // Earlier in waitlist gets higher priority (time-based)
  if (existingWaitlistEntry) {
    const timeFactor = Math.floor(
      (new Date().getTime() - new Date(existingWaitlistEntry.timestamp).getTime()) /
        (1000 * 60 * 60 * 24) // Convert to days
    );
    priority += Math.min(timeFactor * 10, 100); // Max 100 points for time
  }

  return priority;
}

export function promoteFromWaitlist(
  classes: Class[],
  waitlistEntries: WaitlistEntry[],
  students: Student[]
): Array<{ studentId: string; classId: string }> {
  const promoted: Array<{ studentId: string; classId: string }> = [];

  // Sort waitlist by priority
  const sortedWaitlist = waitlistEntries.sort((a, b) => b.priority - a.priority);

  for (const entry of sortedWaitlist) {
    // Find available classes for this program
    const availableClasses = classes.filter(
      (cls) =>
        cls.programLevel === entry.programLevel &&
        cls.students.length < cls.capacity
    );

    if (availableClasses.length > 0) {
      // Assign to the first available class
      promoted.push({
        studentId: entry.studentId,
        classId: availableClasses[0].id,
      });
    }
  }

  return promoted;
}

export function canAssignStudentToClass(
  student: Student,
  classData: Class,
  students: Student[]
): boolean {
  // Check if class is at capacity
  if (classData.students.length >= classData.capacity) {
    return false;
  }

  // Check if student is already in this class
  if (student.programEnrollments && student.programEnrollments.some((e) => e.classId === classData.id && e.status === 'assigned')) {
    return false;
  }

  return true;
}

export function getAvailableClassesForStudent(
  student: Student,
  classes: Class[]
): Class[] {
  return classes.filter(
    (cls) => cls.students.length < cls.capacity
  );
}
