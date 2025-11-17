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
  if (age >= 6 && age <= 8) return 'Creators';
  if (age >= 9 && age <= 11) return 'Innovators';
  if (age >= 12 && age <= 16) return 'Inventors';
  throw new Error('Student age is outside valid range (6-16)');
}

export function calculatePriority(student: Student): number {
  let priority = 0;

  if (student.isReturningStudent) priority += 100;

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

export function abbreviateMonth(month: string): string {
  const monthMap: Record<string, string> = {
    'January': 'Jan',
    'February': 'Feb',
    'March': 'Mar',
    'April': 'Apr',
    'May': 'May',
    'June': 'Jun',
    'July': 'Jul',
    'August': 'Aug',
    'September': 'Sep',
    'October': 'Oct',
    'November': 'Nov',
    'December': 'Dec',
  };
  return monthMap[month] || month;
}

export function abbreviateDay(day: string): string {
  const dayMap: Record<string, string> = {
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun',
  };
  return dayMap[day] || day;
}

export function formatClassName(courseName: string, season: string, year: number, batch: string, slot: string): string {
  // Abbreviate month in season (e.g., "January" -> "Jan")
  const abbreviatedSeason = abbreviateMonth(season);

  // Abbreviate day in slot (e.g., "Saturday 10am-12pm-A" -> "Sat 10am-12pm-A")
  let formattedSlot = slot;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  days.forEach(day => {
    formattedSlot = formattedSlot.replace(day, abbreviateDay(day));
  });

  // Format: Course - Month Year - Batch X - Slot
  return `${courseName} - ${abbreviatedSeason} ${year} - Batch ${batch} - ${formattedSlot}`;
}
