'use client';

import { useState, useMemo } from 'react';
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

  // Calculate chart dimensions and scales
  const chartWidth = 800;
  const chartHeight = 300;
  const padding = { top: 20, right: 20, bottom: 20, left: 50 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Find max value for scaling
  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.enrollments, d.uniqueStudents))
  );
  const yScale = plotHeight / maxValue;
  const xScale = plotWidth / (chartData.length - 1 || 1);

  // Generate SVG path for enrollment line
  const enrollmentPoints = chartData.map((d, i) => ({
    x: padding.left + i * xScale,
    y: padding.top + plotHeight - d.enrollments * yScale,
  }));

  const enrollmentPath = enrollmentPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Generate SVG path for unique students line
  const studentPoints = chartData.map((d, i) => ({
    x: padding.left + i * xScale,
    y: padding.top + plotHeight - d.uniqueStudents * yScale,
  }));

  const studentPath = studentPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Generate area fill paths
  const enrollmentAreaPath =
    enrollmentPath +
    ` L ${padding.left + (chartData.length - 1) * xScale} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;

  const studentAreaPath =
    studentPath +
    ` L ${padding.left + (chartData.length - 1) * xScale} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;

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
      <div className="w-full overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="min-w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <defs>
            <linearGradient id="enrollmentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="studentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = padding.top + (i * plotHeight) / 4;
            return (
              <line
                key={`grid-${i}`}
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Y-axis labels */}
          {Array.from({ length: 5 }).map((_, i) => {
            const value = Math.round((maxValue / 4) * (4 - i));
            const y = padding.top + (i * plotHeight) / 4;
            return (
              <text
                key={`y-label-${i}`}
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#6b7280"
              >
                {value}
              </text>
            );
          })}

          {/* Y-axis */}
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#6b7280" />

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={chartWidth - padding.right}
            y2={padding.top + plotHeight}
            stroke="#6b7280"
          />

          {/* Area fills */}
          <path d={enrollmentAreaPath} fill="url(#enrollmentGradient)" />
          <path d={studentAreaPath} fill="url(#studentGradient)" />

          {/* Lines */}
          <path d={enrollmentPath} stroke="#3b82f6" strokeWidth="2" fill="none" />
          <path d={studentPath} stroke="#a855f7" strokeWidth="2" fill="none" />

          {/* Data points and labels */}
          {enrollmentPoints.map((p, i) => (
            <g key={`enrollment-point-${i}`}>
              <circle cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
            </g>
          ))}

          {studentPoints.map((p, i) => (
            <g key={`student-point-${i}`}>
              <circle cx={p.x} cy={p.y} r="3" fill="#a855f7" />
            </g>
          ))}

          {/* X-axis labels */}
          {chartData.map((d, i) => {
            const x = padding.left + i * xScale;
            const shouldShow = chartData.length <= 12 || i % Math.ceil(chartData.length / 12) === 0;
            return shouldShow ? (
              <text
                key={`x-label-${i}`}
                x={x}
                y={padding.top + plotHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {d.period}
              </text>
            ) : null;
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-gray-700">Total Enrollments</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span className="text-gray-700">Unique Students</span>
        </div>
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
