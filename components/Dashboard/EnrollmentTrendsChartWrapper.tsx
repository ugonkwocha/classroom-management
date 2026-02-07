'use client';

import { useEffect, useState } from 'react';
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="p-8 text-center text-gray-500">Loading chart...</div>;
  }

  return <EnrollmentTrendsChart students={students} programs={programs} />;
}
