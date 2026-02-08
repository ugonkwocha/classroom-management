'use client';

import { useMemo, useState } from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import type { Student, Program, Class } from '@/types';

interface ProgramHistoryComparisonProps {
  students: Student[];
  programs: Program[];
  classes: Class[];
}

interface ProgramYearMetrics {
  year: number;
  uniqueStudents: number;
  enrollmentSlots: number;
  capacity: number;
  utilization: number;
  classCount: number;
  batches: number;
}

interface GrowthIndicator {
  value: number;
  percentage: number;
  isPositive: boolean;
}

export function ProgramHistoryComparison({
  students,
  programs,
  classes,
}: ProgramHistoryComparisonProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');

  // Get unique programs (deduplicated by program name, ordered by name)
  const uniquePrograms = useMemo(() => {
    const seen = new Set<string>();
    return programs
      .filter((p) => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [programs]);

  // Get all years available for the selected program
  const availableYears = useMemo(() => {
    if (!selectedProgramId) return [];
    const programName = programs.find((p) => p.id === selectedProgramId)?.name || '';
    const years = new Set(
      programs
        .filter((p) => p.name === programName)
        .map((p) => p.year)
    );
    return Array.from(years).sort((a, b) => a - b);
  }, [selectedProgramId, programs]);

  // Helper function to calculate metrics for a program in a specific year
  const getProgramYearMetrics = (programName: string, year: number): ProgramYearMetrics | null => {
    const program = programs.find((p) => p.name === programName && p.year === year);
    if (!program) return null;

    // Calculate unique students and enrollment slots for this program
    const programClasses = classes.filter((c) => c.programId === program.id);
    const uniqueStudents = new Set<string>();
    let enrollmentSlots = 0;

    students.forEach((student) => {
      if (student.programEnrollments) {
        student.programEnrollments.forEach((enrollment) => {
          if (enrollment.programId === program.id && enrollment.status === 'ASSIGNED') {
            uniqueStudents.add(student.id);
            if (enrollment.classId) {
              enrollmentSlots += 1;
            }
          }
        });
      }
    });

    const capacity = programClasses.reduce((sum, c) => sum + c.capacity, 0);
    const utilization = capacity > 0 ? Math.round((enrollmentSlots / capacity) * 100) : 0;

    return {
      year,
      uniqueStudents: uniqueStudents.size,
      enrollmentSlots,
      capacity,
      utilization,
      classCount: programClasses.length,
      batches: program.batches,
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

  // Get metrics for all years of the selected program
  const historyData = useMemo(() => {
    if (!selectedProgramId) return [];
    const program = programs.find((p) => p.id === selectedProgramId);
    if (!program) return [];

    return availableYears
      .map((year) => getProgramYearMetrics(program.name, year))
      .filter((m): m is ProgramYearMetrics => m !== null);
  }, [selectedProgramId, availableYears, students, programs, classes]);

  const baselineMetrics = historyData.length > 0 ? historyData[0] : null;
  const selectedProgram = programs.find((p) => p.id === selectedProgramId);

  return (
    <div className="space-y-4">
      {/* Program Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700 block">
          Select Program to View History:
        </label>
        <select
          value={selectedProgramId}
          onChange={(e) => setSelectedProgramId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-#db3236"
        >
          <option value="">-- Choose a program --</option>
          {uniquePrograms.map((program) => {
            const yearsAvailable = programs
              .filter((p) => p.name === program.name)
              .map((p) => p.year)
              .sort((a, b) => a - b);
            return (
              <option key={program.id} value={program.id}>
                {program.name} ({yearsAvailable.join(', ')})
              </option>
            );
          })}
        </select>
      </div>

      {/* Comparison Cards */}
      {!selectedProgramId ? (
        <div className="p-8 text-center text-gray-500">
          <p className="mb-2">Select a program to view its performance history across years.</p>
          <p className="text-sm">Use the dropdown above to choose a program.</p>
        </div>
      ) : historyData.length < 2 ? (
        <div className="p-8 text-center text-gray-500">
          <p className="mb-2">Only one year of data available for this program.</p>
          <p className="text-sm">Programs with multiple years will show growth indicators.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">
            {selectedProgram?.name} - Program History ({baselineMetrics?.year} to {historyData[historyData.length - 1].year})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {historyData.map((yearData, index) => {
              const isBaseline = index === 0;
              const growth =
                !isBaseline && baselineMetrics
                  ? {
                      uniqueStudents: calculateGrowth(
                        yearData.uniqueStudents,
                        baselineMetrics.uniqueStudents
                      ),
                      enrollmentSlots: calculateGrowth(
                        yearData.enrollmentSlots,
                        baselineMetrics.enrollmentSlots
                      ),
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
                <div
                  key={yearData.year}
                  className={`p-4 rounded-lg border-2 ${
                    isBaseline ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* Header */}
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-gray-900">{yearData.year}</h3>
                    {isBaseline && (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-200 text-#3a6dd9 mt-2 inline-block">
                        Baseline Year
                      </span>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="space-y-3">
                    {/* Unique Students */}
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Unique Students</p>
                      <div className="flex items-baseline justify-between">
                        <p className="text-2xl font-bold text-#db3236">
                          {yearData.uniqueStudents}
                        </p>
                        {growth && (
                          <div className="flex items-center gap-1">
                            {growth.uniqueStudents.isPositive ? (
                              <FiTrendingUp className="text-green-600" size={16} />
                            ) : (
                              <FiTrendingDown className="text-red-600" size={16} />
                            )}
                            <span
                              className={`text-sm font-semibold ${
                                growth.uniqueStudents.isPositive ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {growth.uniqueStudents.isPositive ? '+' : '-'}
                              {growth.uniqueStudents.percentage}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enrollment Slots */}
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Enrollment Slots</p>
                      <div className="flex items-baseline justify-between">
                        <p className="text-2xl font-bold text-#4885ed">
                          {yearData.enrollmentSlots}
                        </p>
                        {growth && (
                          <div className="flex items-center gap-1">
                            {growth.enrollmentSlots.isPositive ? (
                              <FiTrendingUp className="text-green-600" size={16} />
                            ) : (
                              <FiTrendingDown className="text-red-600" size={16} />
                            )}
                            <span
                              className={`text-sm font-semibold ${
                                growth.enrollmentSlots.isPositive ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {growth.enrollmentSlots.isPositive ? '+' : '-'}
                              {growth.enrollmentSlots.percentage}%
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
                              <FiTrendingUp className="text-green-600" size={16} />
                            ) : (
                              <FiTrendingDown className="text-red-600" size={16} />
                            )}
                            <span
                              className={`text-sm font-semibold ${
                                growth.capacity.isPositive ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {growth.capacity.isPositive ? '+' : '-'}
                              {growth.capacity.percentage}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Utilization */}
                    <div
                      className={`p-3 rounded-lg ${utilisationBgColor} border border-gray-200`}
                    >
                      <p className="text-xs text-gray-600 font-medium">Utilization</p>
                      <div className="flex items-baseline justify-between mt-1">
                        <p className={`text-2xl font-bold ${utilisationTextColor}`}>
                          {yearData.utilization}%
                        </p>
                        {growth && (
                          <span
                            className={`text-sm font-semibold ${
                              growth.utilization.isPositive ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {growth.utilization.isPositive ? '+' : ''}
                            {growth.utilization.value}pp
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Classes & Batches */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-300">
                      <div>
                        <p className="text-xs text-gray-600">Classes</p>
                        <p className="text-lg font-bold text-gray-900">{yearData.classCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Batches</p>
                        <p className="text-lg font-bold text-gray-900">{yearData.batches}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
