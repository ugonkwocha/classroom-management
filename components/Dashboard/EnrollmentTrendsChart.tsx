'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format, startOfMonth, startOfQuarter, parseISO } from 'date-fns';
import type { Student, Program } from '@/types';

interface EnrollmentTrendsChartProps {
  students: Student[];
  programs: Program[];
}

type ViewMode = 'month' | 'quarter';

interface TrendDataPoint {
  period: string;
  enrollments: number;
  uniqueStudents: number;
}

export function EnrollmentTrendsChart({ students, programs }: EnrollmentTrendsChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const chartData = useMemo(() => {
    // Extract all enrollments with dates
    const enrollmentEvents: Array<{
      date: Date;
      studentId: string;
      programId: string;
    }> = [];

    students.forEach((student) => {
      if (student.programEnrollments) {
        student.programEnrollments.forEach((enrollment) => {
          // Only count ASSIGNED enrollments to avoid counting waitlisted students
          if (enrollment.status === 'ASSIGNED' && enrollment.enrollmentDate) {
            try {
              enrollmentEvents.push({
                date: parseISO(enrollment.enrollmentDate),
                studentId: student.id,
                programId: enrollment.programId,
              });
            } catch (e) {
              // Skip invalid dates
            }
          }
        });
      }
    });

    // If no enrollment data, return empty array
    if (enrollmentEvents.length === 0) {
      return [];
    }

    // Group by month or quarter
    const groupedData: Record<
      string,
      {
        period: string;
        enrollments: number;
        uniqueStudents: Set<string>;
        periodDate: Date;
      }
    > = {};

    enrollmentEvents.forEach((event) => {
      const periodDate =
        viewMode === 'month' ? startOfMonth(event.date) : startOfQuarter(event.date);
      const key =
        viewMode === 'month'
          ? format(periodDate, 'MMM yyyy') // "Jan 2026"
          : `Q${format(periodDate, 'Q')} ${format(periodDate, 'yyyy')}`; // "Q1 2026"

      if (!groupedData[key]) {
        groupedData[key] = {
          period: key,
          enrollments: 0,
          uniqueStudents: new Set(),
          periodDate,
        };
      }

      groupedData[key].enrollments += 1;
      groupedData[key].uniqueStudents.add(event.studentId);
    });

    // Convert to array and sort chronologically
    const data: TrendDataPoint[] = Object.values(groupedData)
      .map((d) => ({
        period: d.period,
        enrollments: d.enrollments,
        uniqueStudents: d.uniqueStudents.size,
      }))
      .sort((a, b) => {
        // Parse period strings to dates for proper sorting
        const getPeriodDate = (period: string): Date => {
          const parts = period.split(' ');
          if (viewMode === 'month') {
            const monthNum = getMonthNumber(parts[0]);
            return parseISO(`${parts[1]}-${monthNum}-01`);
          } else {
            // Extract quarter number from "Q1", "Q2", etc.
            const quarterNum = parts[0].charAt(1);
            const quarterMonthNum = getQuarterMonth(`Q${quarterNum}`);
            return parseISO(`${parts[1]}-${quarterMonthNum}-01`);
          }
        };
        const aDate = getPeriodDate(a.period);
        const bDate = getPeriodDate(b.period);
        return aDate.getTime() - bDate.getTime();
      });

    return data;
  }, [students, viewMode]);

  // Helper function to convert month abbreviation to number
  const getMonthNumber = (month: string): string => {
    const months: Record<string, string> = {
      Jan: '01',
      Feb: '02',
      Mar: '03',
      Apr: '04',
      May: '05',
      Jun: '06',
      Jul: '07',
      Aug: '08',
      Sep: '09',
      Oct: '10',
      Nov: '11',
      Dec: '12',
    };
    return months[month] || '01';
  };

  // Helper function to convert quarter to month
  const getQuarterMonth = (quarter: string): string => {
    const quarterMap: Record<string, string> = {
      Q1: '01',
      Q2: '04',
      Q3: '07',
      Q4: '10',
    };
    return quarterMap[quarter] || '01';
  };

  if (chartData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No enrollment data available yet. Data will appear once students are enrolled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle Controls */}
      <div className="flex items-center justify-end gap-2">
        <label className="text-sm font-medium text-gray-700">View by:</label>
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="month">Month</option>
          <option value="quarter">Quarter</option>
        </select>
      </div>

      {/* Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              stroke="#6b7280"
              style={{ fontSize: '0.875rem' }}
              angle={chartData.length > 12 ? -45 : 0}
              height={chartData.length > 12 ? 80 : 60}
            />
            <YAxis stroke="#6b7280" style={{ fontSize: '0.875rem' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
              formatter={(value) => value.toString()}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => {
                if (value === 'enrollments') return 'Total Enrollments';
                if (value === 'uniqueStudents') return 'Unique Students';
                return value;
              }}
            />
            <Area
              type="monotone"
              dataKey="enrollments"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorEnrollments)"
              name="enrollments"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="uniqueStudents"
              stroke="#a855f7"
              fillOpacity={1}
              fill="url(#colorStudents)"
              name="uniqueStudents"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-600 font-medium">Total Enrollments</p>
          <p className="text-2xl font-bold text-blue-600">
            {chartData.reduce((sum, d) => sum + d.enrollments, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-medium">Total Unique Students</p>
          <p className="text-2xl font-bold text-purple-600">
            {chartData.reduce((sum, d) => sum + d.uniqueStudents, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-medium">Time Period</p>
          <p className="text-2xl font-bold text-gray-900">
            {chartData.length} {viewMode === 'month' ? 'months' : 'quarters'}
          </p>
        </div>
      </div>
    </div>
  );
}
