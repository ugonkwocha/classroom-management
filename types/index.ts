export type ProgramLevel = 'AI Explorers' | 'AI Creators' | 'AI Innovators';
export type ProgramType = 'WeekendClub' | 'HolidayCamp';
export type Season = 'January' | 'Easter' | 'May' | 'Summer' | 'October';

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

export interface Student {
  id: string;
  name: string;
  dateOfBirth: string;
  contactInfo: string;
  programLevel: ProgramLevel;
  classId?: string;
  priority: number;
  isReturning: boolean;
  hasSiblings: boolean;
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
  teacher: string;
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
