import { ProgramLevel, Student } from '@/types';

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

export function getProgramLevel(age: number): ProgramLevel {
  if (age >= 6 && age <= 8) return 'AI Explorers';
  if (age >= 9 && age <= 12) return 'AI Creators';
  if (age >= 13 && age <= 16) return 'AI Innovators';
  throw new Error('Student age is outside valid range (6-16)');
}

export function calculatePriority(student: Student): number {
  let priority = 0;

  if (student.isReturning) priority += 100;
  if (student.hasSiblings) priority += 50;

  return priority;
}

export function clsx(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
