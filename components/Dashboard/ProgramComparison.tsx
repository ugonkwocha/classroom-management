'use client';

import { useMemo, useState } from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import type { Student, Program, Class } from '@/types';

interface ProgramComparisonProps {
  students: Student[];
  programs: Program[];
  classes: Class[];
}

interface ProgramMetrics {
  programId: string;
  programName: string;
  programType: 'WEEKEND_CLUB' | 'HOLIDAY_CAMP';
  season: string;
  year: number;
  uniqueStudents: number;
  enrollmentSlots: number;
  capacity: number;
  utilization: number;
  classCount: number;
  batches: number;
}

interface ComparisonMetrics {
  uniqueStudents: { value: number; percentage: number; isBetter: boolean };
  enrollmentSlots: { value: number; percentage: number; isBetter: boolean };
  capacity: { value: number; percentage: number; isBetter: boolean };
  utilization: { value: number; percentage: number; isBetter: boolean };
}

export function ProgramComparison({
  students,
  programs,
  classes,
}: ProgramComparisonProps) {
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Get unique years and types
  const availableYears = useMemo(() => {
    const years = new Set(programs.map((p) => p.year));
    return Array.from(years).sort((a, b) => a - b);
  }, [programs]);

  const availableTypes = ['WEEKEND_CLUB', 'HOLIDAY_CAMP'];

  // Filter programs based on year and type
  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const yearMatch = yearFilter === 'all' || program.year === parseInt(yearFilter);
      const typeMatch = typeFilter === 'all' || program.type === typeFilter;
      return yearMatch && typeMatch;
    });
  }, [programs, yearFilter, typeFilter]);

  // Helper function to calculate metrics for a program (reuses logic from Dashboard)
  const getProgramMetrics = (programId: string): ProgramMetrics | null => {
    const program = programs.find((p) => p.id === programId);
    if (!program) return null;

    // Calculate unique students and enrollment slots for this program
    const programClasses = classes.filter((c) => c.programId === programId);
    const uniqueStudents = new Set<string>();
    let enrollmentSlots = 0;

    students.forEach((student) => {
      if (student.programEnrollments) {
        student.programEnrollments.forEach((enrollment) => {
          if (enrollment.programId === programId && enrollment.status === 'ASSIGNED') {
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
      programId: program.id,
      programName: program.name,
      programType: program.type,
      season: program.season,
      year: program.year,
      uniqueStudents: uniqueStudents.size,
      enrollmentSlots,
      capacity,
      utilization,
      classCount: programClasses.length,
      batches: program.batches,
    };
  };

  // Calculate comparison metrics
  const calculateComparison = (current: number, baseline: number): { value: number; percentage: number; isBetter: boolean } => {
    const diff = current - baseline;
    const percentage = baseline === 0 ? 0 : Math.round((diff / baseline) * 100);

    return {
      value: diff,
      percentage: Math.abs(percentage),
      isBetter: diff >= 0,
    };
  };

  // Get metrics for all selected programs
  const comparisonData = useMemo(() => {
    return selectedPrograms
      .map((id) => getProgramMetrics(id))
      .filter((m): m is ProgramMetrics => m !== null);
  }, [selectedPrograms, students, programs, classes]);

  const baselineMetrics = comparisonData.length > 0 ? comparisonData[0] : null;

  // Toggle program selection
  const toggleProgram = (programId: string) => {
    setSelectedPrograms((prev) =>
      prev.includes(programId)
        ? prev.filter((id) => id !== programId)
        : [...prev, programId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-#db3236"
          >
            <option value="all">All Years</option>
            {availableYears.map((year) => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-#db3236"
          >
            <option value="all">All Types</option>
            <option value="WEEKEND_CLUB">Weekend Club</option>
            <option value="HOLIDAY_CAMP">Holiday Camp</option>
          </select>
        </div>

        {/* Program Selector */}
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <label className="text-sm font-medium text-gray-700 block mb-3">
            Select Programs to Compare:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {filteredPrograms.length === 0 ? (
              <p className="text-sm text-gray-500">No programs match the selected filters.</p>
            ) : (
              filteredPrograms.map((program) => (
                <label
                  key={program.id}
                  className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPrograms.includes(program.id)}
                    onChange={() => toggleProgram(program.id)}
                    className="rounded w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">
                    {program.name} - {program.season} {program.year}
                  </span>
                </label>
              ))
            )}
          </div>
          {selectedPrograms.length > 0 && (
            <p className="text-xs text-gray-600 mt-3">
              {selectedPrograms.length} program{selectedPrograms.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </div>

      {/* Comparison Cards */}
      {selectedPrograms.length < 2 ? (
        <div className="p-8 text-center text-gray-500">
          <p className="mb-2">Select at least 2 programs to compare their performance.</p>
          <p className="text-sm">Use the checkboxes above to choose programs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisonData.map((programData, index) => {
            const isBaseline = index === 0;
            const comparison = !isBaseline && baselineMetrics
              ? {
                  uniqueStudents: calculateComparison(
                    programData.uniqueStudents,
                    baselineMetrics.uniqueStudents
                  ),
                  enrollmentSlots: calculateComparison(
                    programData.enrollmentSlots,
                    baselineMetrics.enrollmentSlots
                  ),
                  capacity: calculateComparison(programData.capacity, baselineMetrics.capacity),
                  utilization: {
                    value: programData.utilization - baselineMetrics.utilization,
                    percentage: Math.abs(programData.utilization - baselineMetrics.utilization),
                    isBetter: programData.utilization >= baselineMetrics.utilization,
                  },
                }
              : null;

            // Determine utilization color
            let utilisationBgColor = 'bg-green-50';
            let utilisationBorderColor = 'border-green-200';
            let utilisationTextColor = 'text-green-700';

            if (programData.utilization >= 90) {
              utilisationBgColor = 'bg-red-50';
              utilisationBorderColor = 'border-red-200';
              utilisationTextColor = 'text-red-700';
            } else if (programData.utilization >= 70) {
              utilisationBgColor = 'bg-yellow-50';
              utilisationBorderColor = 'border-yellow-200';
              utilisationTextColor = 'text-yellow-700';
            }

            // Determine program type color
            const typeColor = programData.programType === 'WEEKEND_CLUB'
              ? 'bg-red-100 text-#c12b30'
              : 'bg-orange-100 text-orange-700';
            const typeLabel = programData.programType === 'WEEKEND_CLUB'
              ? 'Weekend Club'
              : 'Holiday Camp';

            return (
              <div
                key={programData.programId}
                className={`p-4 rounded-lg border-2 ${
                  isBaseline ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-base font-bold text-gray-900">{programData.programName}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${typeColor}`}>
                      {typeLabel}
                    </span>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-200 text-gray-700">
                      {programData.season} {programData.year}
                    </span>
                    {isBaseline && (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-200 text-#3a6dd9">
                        Baseline
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-3">
                  {/* Unique Students */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Unique Students</p>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-bold text-#db3236">{programData.uniqueStudents}</p>
                      {comparison && (
                        <div className="flex items-center gap-1">
                          {comparison.uniqueStudents.isBetter ? (
                            <FiTrendingUp className="text-green-600" size={16} />
                          ) : (
                            <FiTrendingDown className="text-red-600" size={16} />
                          )}
                          <span
                            className={`text-sm font-semibold ${
                              comparison.uniqueStudents.isBetter ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {comparison.uniqueStudents.isBetter ? '+' : '-'}
                            {comparison.uniqueStudents.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enrollment Slots */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Enrollment Slots</p>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-bold text-#4885ed">{programData.enrollmentSlots}</p>
                      {comparison && (
                        <div className="flex items-center gap-1">
                          {comparison.enrollmentSlots.isBetter ? (
                            <FiTrendingUp className="text-green-600" size={16} />
                          ) : (
                            <FiTrendingDown className="text-red-600" size={16} />
                          )}
                          <span
                            className={`text-sm font-semibold ${
                              comparison.enrollmentSlots.isBetter ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {comparison.enrollmentSlots.isBetter ? '+' : '-'}
                            {comparison.enrollmentSlots.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Capacity */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Total Capacity</p>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-bold text-gray-900">{programData.capacity}</p>
                      {comparison && (
                        <div className="flex items-center gap-1">
                          {comparison.capacity.isBetter ? (
                            <FiTrendingUp className="text-green-600" size={16} />
                          ) : (
                            <FiTrendingDown className="text-red-600" size={16} />
                          )}
                          <span
                            className={`text-sm font-semibold ${
                              comparison.capacity.isBetter ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {comparison.capacity.isBetter ? '+' : '-'}
                            {comparison.capacity.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Utilization */}
                  <div className={`p-3 rounded-lg ${utilisationBgColor} border border-gray-200`}>
                    <p className="text-xs text-gray-600 font-medium">Utilization</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <p className={`text-2xl font-bold ${utilisationTextColor}`}>
                        {programData.utilization}%
                      </p>
                      {comparison && (
                        <span
                          className={`text-sm font-semibold ${
                            comparison.utilization.isBetter ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {comparison.utilization.isBetter ? '+' : ''}{comparison.utilization.value}pp
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Classes & Batches */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-300">
                    <div>
                      <p className="text-xs text-gray-600">Classes</p>
                      <p className="text-lg font-bold text-gray-900">{programData.classCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Batches</p>
                      <p className="text-lg font-bold text-gray-900">{programData.batches}</p>
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
