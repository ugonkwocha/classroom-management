'use client';

import { Suspense, lazy } from 'react';
import type { Student, Program } from '@/types';

interface EnrollmentTrendsChartWrapperProps {
  students: Student[];
  programs: Program[];
}

const EnrollmentTrendsChart = lazy(() =>
  import('./EnrollmentTrendsChart').then((mod) => ({
    default: mod.EnrollmentTrendsChart,
  }))
);

export function EnrollmentTrendsChartWrapper({
  students,
  programs,
}: EnrollmentTrendsChartWrapperProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading chart...</div>}>
      <EnrollmentTrendsChart students={students} programs={programs} />
    </Suspense>
  );
}
