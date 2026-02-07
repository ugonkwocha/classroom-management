'use client';

import { EnrollmentTrendsChart } from './EnrollmentTrendsChart';
import type { Student, Program } from '@/types';

interface EnrollmentTrendsChartWrapperProps {
  students: Student[];
  programs: Program[];
}

export function EnrollmentTrendsChartWrapper({
  students,
  programs,
}: EnrollmentTrendsChartWrapperProps) {
  return <EnrollmentTrendsChart students={students} programs={programs} />;
}
