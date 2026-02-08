'use client';

import { useMemo, useState } from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import type { Student, Program, Class } from '@/types';

interface YearOverYearComparisonProps {
  students: Student[];
  programs: Program[];
  classes: Class[];
}

interface YearMetrics {
  year: number;
  uniqueStudents: number;
  enrollmentSlots: number;
  capacity: number;
  utilization: number;
  programCount: number;
  classCount: number;
}

interface GrowthIndicator {
  value: number;
  percentage: number;
  isPositive: boolean;
}

export function YearOverYearComparison({
  students,
  programs,
  classes,
}: YearOverYearComparisonProps) {
  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  // Get unique years from programs
  const availableYears = useMemo(() => {
    const years = new Set(programs.map((p) => p.year));
    return Array.from(years).sort((a, b) => a - b);
  }, [programs]);

  // Calculate metrics for a specific year
  const getYearMetrics = (year: number): YearMetrics => {
    const yearPrograms = programs.filter((p) => p.year === year);
    const yearClasses = classes.filter((c) =>
      yearPrograms.some((p) => p.id === c.programId)
    );

    // Calculate unique students enrolled in this year
    const uniqueStudents = new Set<string>();
    let enrollmentSlots = 0;

    students.forEach((student) => {
      if (student.programEnrollments) {
        student.programEnrollments.forEach((enrollment) => {
          const program = yearPrograms.find((p) => p.id === enrollment.programId);
          if (program && enrollment.status === 'ASSIGNED') {
            uniqueStudents.add(student.id);
            if (enrollment.classId) {
              enrollmentSlots += 1;
            }
          }
        });
      }
    });

    const capacity = yearClasses.reduce((sum, c) => sum + c.capacity, 0);
    const utilization = capacity > 0 ? Math.round((enrollmentSlots / capacity) * 100) : 0;

    return {
      year,
      uniqueStudents: uniqueStudents.size,
      enrollmentSlots,
      capacity,
      utilization,
      programCount: yearPrograms.length,
      classCount: yearClasses.length,
    };
  };

  // Calculate growth metrics
  const calculateGrowth = (current: number, baseline: number): GrowthIndicator => {
    const diff = current - baseline;
    const percentage = baseline === 0 ? 0 : Math.round((diff / baseline) * 100);

    return {
      value: diff,
      percentage: Math.abs(percentage),
      isPositive: diff >= 0,
    };
  };

  // Get metrics for all selected years
  const comparisonData = useMemo(() => {
    if (selectedYears.length === 0) return [];
    return selectedYears.map((year) => getYearMetrics(year));
  }, [selectedYears, students, programs, classes]);

  // Get baseline year (first selected year)
  const baselineMetrics = comparisonData.length > 0 ? comparisonData[0] : null;

  // Toggle year selection
  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort()
    );
  };

  if (availableYears.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No programs available to compare.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Year Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Compare Years:</label>
        <div className="flex gap-2 flex-wrap">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedYears.includes(year)
                  ? 'bg-#db3236 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Cards */}
      {selectedYears.length < 2 ? (
        <div className="p-8 text-center text-gray-500">
          <p>Select at least 2 years to compare enrollment metrics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisonData.map((yearData, index) => {
            const isBaseline = index === 0;
            const growth = !isBaseline && baselineMetrics
              ? {
                  uniqueStudents: calculateGrowth(yearData.uniqueStudents, baselineMetrics.uniqueStudents),
                  enrollmentSlots: calculateGrowth(yearData.enrollmentSlots, baselineMetrics.enrollmentSlots),
                  capacity: calculateGrowth(yearData.capacity, baselineMetrics.capacity),
                  utilization: {
                    value: yearData.utilization - baselineMetrics.utilization,
                    percentage: Math.abs(yearData.utilization - baselineMetrics.utilization),
                    isPositive: yearData.utilization >= baselineMetrics.utilization,
                  },
                }
              : null;

            // Determine utilization color
            let utilisationBgColor = 'bg-green-50';
            let utilisationBorderColor = 'border-green-200';
            let utilisationTextColor = 'text-green-700';

            if (yearData.utilization >= 90) {
              utilisationBgColor = 'bg-red-50';
              utilisationBorderColor = 'border-red-200';
              utilisationTextColor = 'text-red-700';
            } else if (yearData.utilization >= 70) {
              utilisationBgColor = 'bg-yellow-50';
              utilisationBorderColor = 'border-yellow-200';
              utilisationTextColor = 'text-yellow-700';
            }

            return (
              <div key={yearData.year} className={`p-4 rounded-lg border-2 ${
                isBaseline ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}>
                {/* Year Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{yearData.year}</h3>
                  {isBaseline && <span className="text-xs font-semibold text-#3a6dd9 bg-blue-100 px-2 py-1 rounded">Baseline</span>}
                </div>

                {/* Metrics Grid */}
                <div className="space-y-3">
                  {/* Unique Students */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Unique Students</p>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-bold text-#db3236">{yearData.uniqueStudents}</p>
                      {growth && (
                        <div className="flex items-center gap-1">
                          {growth.uniqueStudents.isPositive ? (
                            <FiTrendingUp className="text-green-600" />
                          ) : (
                            <FiTrendingDown className="text-red-600" />
                          )}
                          <span className={`text-sm font-semibold ${
                            growth.uniqueStudents.isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {growth.uniqueStudents.isPositive ? '+' : '-'}{growth.uniqueStudents.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enrollment Slots */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Enrollment Slots</p>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-bold text-#4885ed">{yearData.enrollmentSlots}</p>
                      {growth && (
                        <div className="flex items-center gap-1">
                          {growth.enrollmentSlots.isPositive ? (
                            <FiTrendingUp className="text-green-600" />
                          ) : (
                            <FiTrendingDown className="text-red-600" />
                          )}
                          <span className={`text-sm font-semibold ${
                            growth.enrollmentSlots.isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {growth.enrollmentSlots.isPositive ? '+' : '-'}{growth.enrollmentSlots.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Capacity */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Total Capacity</p>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-bold text-gray-900">{yearData.capacity}</p>
                      {growth && (
                        <div className="flex items-center gap-1">
                          {growth.capacity.isPositive ? (
                            <FiTrendingUp className="text-green-600" />
                          ) : (
                            <FiTrendingDown className="text-red-600" />
                          )}
                          <span className={`text-sm font-semibold ${
                            growth.capacity.isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {growth.capacity.isPositive ? '+' : '-'}{growth.capacity.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Utilization */}
                  <div className={`p-3 rounded-lg ${utilisationBgColor} border border-gray-200`}>
                    <p className="text-xs text-gray-600 font-medium">Utilization</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <p className={`text-2xl font-bold ${utilisationTextColor}`}>{yearData.utilization}%</p>
                      {growth && (
                        <span className={`text-sm font-semibold ${
                          growth.utilization.isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {growth.utilization.isPositive ? '+' : ''}{growth.utilization.value}pp
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Programs & Classes */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-300">
                    <div>
                      <p className="text-xs text-gray-600">Programs</p>
                      <p className="text-lg font-bold text-gray-900">{yearData.programCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Classes</p>
                      <p className="text-lg font-bold text-gray-900">{yearData.classCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
