import { Student, Class, WaitlistEntry } from '@/types';
import { calculateAge, getProgramLevel } from '@/lib/utils';

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

  // Get unassigned students
  const unassignedStudents = students.filter((s) => !s.classId);

  // Sort students by priority (returning students first, then those with siblings)
  const sortedStudents = unassignedStudents.sort((a, b) => {
    const priorityA = (a.isReturning ? 100 : 0) + (a.hasSiblings ? 50 : 0);
    const priorityB = (b.isReturning ? 100 : 0) + (b.hasSiblings ? 50 : 0);
    return priorityB - priorityA;
  });

  // Try to assign each student
  for (const student of sortedStudents) {
    try {
      const age = calculateAge(student.dateOfBirth);
      const programLevel = getProgramLevel(age);

      // Find available classes for this program
      const availableClasses = classes.filter(
        (cls) =>
          cls.programLevel === programLevel &&
          cls.students.length < cls.capacity
      );

      if (availableClasses.length > 0) {
        // Assign to the class with the most capacity
        const selectedClass = availableClasses.reduce((prev, curr) =>
          (curr.students.length > prev.students.length) ? curr : prev
        );

        assigned.push({
          studentId: student.id,
          classId: selectedClass.id,
        });
      } else {
        // Add to waitlist if no space available
        const existingWaitlistEntry = existingWaitlist.find((w) => w.studentId === student.id);
        if (!existingWaitlistEntry) {
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
  if (student.isReturning) priority += 100;

  // Students with siblings get higher priority
  if (student.hasSiblings) priority += 50;

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

  // Check if student's program matches the class program
  if (student.programLevel !== classData.programLevel) {
    return false;
  }

  // Check if student is already in a class
  if (student.classId && student.classId !== classData.id) {
    return false;
  }

  return true;
}

export function getAvailableClassesForStudent(
  student: Student,
  classes: Class[]
): Class[] {
  return classes.filter(
    (cls) =>
      cls.programLevel === student.programLevel &&
      cls.students.length < cls.capacity
  );
}
