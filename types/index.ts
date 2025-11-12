export type ProgramLevel = 'AI Explorers' | 'AI Creators' | 'AI Innovators';

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
  programLevel: ProgramLevel;
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
