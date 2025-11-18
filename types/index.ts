export type ProgramLevel = 'CREATORS' | 'INNOVATORS' | 'INVENTORS';
export type ProgramType = 'WEEKEND_CLUB' | 'HOLIDAY_CAMP';
export type Season = 'JANUARY' | 'EASTER' | 'MAY' | 'SUMMER' | 'OCTOBER';
export type TeacherStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export interface Course {
  id: string;
  name: string;
  description: string;
  programLevels: ProgramLevel[];
  createdAt: string;
}

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  season: Season;
  year: number;
  batches: number;
  slots: string[];
  createdAt: string;
}

// Course history entry for tracking courses student has taken
export interface CourseHistory {
  id: string;
  courseId: string;
  courseName: string; // for quick reference
  programId?: string;
  programName?: string;
  batch?: number;
  year?: number;
  completionStatus: 'completed' | 'in-progress' | 'dropped';
  startDate?: string;
  endDate?: string;
  performanceNotes?: string;
  dateAdded: string;
}

// Program enrollment entry for tracking student's enrollment in each program
export interface ProgramEnrollment {
  id: string;
  programId: string;
  batchNumber: number;
  classId?: string; // May not be assigned immediately (waitlist)
  enrollmentDate: string;
  status: 'waitlist' | 'assigned' | 'completed' | 'dropped';
  paymentStatus?: 'PENDING' | 'CONFIRMED' | 'COMPLETED'; // Program-specific payment status
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  parentEmail?: string;
  parentPhone?: string;
  dateOfBirth?: string;
  isReturningStudent: boolean;
  courseHistory: CourseHistory[]; // Past courses taken
  programEnrollments: ProgramEnrollment[]; // Current & past program enrollments
  paymentStatus: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
  createdAt: string;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio?: string;
  profilePhoto?: string;
  status: TeacherStatus;
  qualifiedCourses: string[]; // Array of course IDs
  createdAt: string;
}

export interface Class {
  id: string;
  name: string;
  courseId: string;
  programId: string;
  programLevel: ProgramLevel;
  batch: number;
  slot: string;
  schedule: string;
  students: string[];
  capacity: number;
  teacherId?: string; // Optional: teachers can be assigned later
  isArchived: boolean; // Archive instead of delete (default: false)
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  studentId: string;
  programLevel: ProgramLevel;
  priority: number;
  timestamp: string;
}

export interface Stats {
  totalStudents: number;
  totalClasses: number;
  totalEnrolled: number;
  waitlistCount: number;
  classCapacityPercentage: number;
}
