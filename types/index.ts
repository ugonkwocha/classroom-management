export type ProgramLevel = 'CREATORS' | 'INNOVATORS' | 'INVENTORS';
export type ProgramType = 'WEEKEND_CLUB' | 'HOLIDAY_CAMP';
export type Season = 'JANUARY' | 'EASTER' | 'MAY' | 'SUMMER' | 'OCTOBER';
export type TeacherStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'STAFF';
export type PriceType = 'FULL_PRICE' | 'SIBLING_DISCOUNT' | 'EARLY_BIRD';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  startDate: string;
  createdAt: string;
}

// Course history entry for tracking courses student has taken
export interface CourseHistory {
  id: string;
  courseId: string;
  courseName: string; // for quick reference
  programId?: string | null;
  programName?: string | null;
  batch?: number;
  year?: number;
  completionStatus: 'COMPLETED' | 'IN_PROGRESS';
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
  status: 'WAITLIST' | 'ASSIGNED' | 'COMPLETED' | 'DROPPED';
  paymentStatus?: 'PENDING' | 'CONFIRMED' | 'COMPLETED'; // Program-specific payment status
  priceType?: PriceType; // Pricing option selected
  priceAmount?: number; // Amount paid in Naira
}

// Pricing option for enrollment
export interface PriceOption {
  type: PriceType;
  label: string;
  amount: number;
  description: string;
}

// Pricing configuration for super admin management
export interface PricingConfig {
  id: string;
  priceType: PriceType;
  amount: number;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
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
  enrollments: ProgramEnrollment[]; // Current & past program enrollments
  programEnrollments?: ProgramEnrollment[]; // Alias for backwards compatibility in forms
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

export interface Stats {
  totalStudents: number;
  totalClasses: number;
  totalEnrolled: number;
  waitlistCount: number;
  classCapacityPercentage: number;
}
