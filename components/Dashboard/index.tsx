'use client';

import { useState } from 'react';
import { useStudents, useClasses, usePrograms } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, Modal } from '@/components/ui';
import { StatCard } from './StatCard';
import { EnrollmentTrendsChartWrapper } from './EnrollmentTrendsChartWrapper';
import { YearOverYearComparison } from './YearOverYearComparison';
import { ProgramComparison } from './ProgramComparison';
import { ProgramHistoryComparison } from './ProgramHistoryComparison';
import { RevenueAnalytics } from './RevenueAnalytics';
import { RevenueForecast } from './RevenueForecast';
import { DiscountAdoptionAnalysis } from './DiscountAdoptionAnalysis';
import { calculateAge } from '@/lib/utils';

interface DashboardProps {
  onSelectStudent?: (studentId: string) => void;
}

export function Dashboard({ onSelectStudent }: DashboardProps) {
  const { students, isLoaded: studentsLoaded } = useStudents();
  const { classes, isLoaded: classesLoaded } = useClasses();
  const { programs } = usePrograms();
  const { user } = useAuth();
  const [selectedProgram, setSelectedProgram] = useState<string>(''); // Filter by program
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const [detailsModal, setDetailsModal] = useState<{ type: 'unassigned' | 'availability' | null; programFilter: string }>({ type: null, programFilter: '' });
  const [analyticsViewMode, setAnalyticsViewMode] = useState<'program' | 'season' | 'year'>('program');
  const [analyticsYearFilter, setAnalyticsYearFilter] = useState<string>('all');

  if (!studentsLoaded || !classesLoaded) {
    return <div>Loading...</div>;
  }

  const totalStudents = students.length;
  const classesArray = Array.isArray(classes) ? classes : [];
  const totalClasses = classesArray.length;

  // Calculate unique enrolled students (count each student only once even if in multiple classes)
  const totalUniqueEnrolled = students.filter((s) => {
    if (!s.programEnrollments || s.programEnrollments.length === 0) return false;
    // Student is enrolled if they have at least one class assignment with ASSIGNED status
    return s.programEnrollments.some((e) => e.classId && e.status === 'ASSIGNED');
  }).length;

  // Calculate total enrollment slots (count each class assignment separately)
  const totalEnrollmentSlots = students.reduce((sum, s) => {
    if (!s.programEnrollments || s.programEnrollments.length === 0) return sum;
    const assignedSlots = s.programEnrollments.filter((e) => e.classId && e.status === 'ASSIGNED').length;
    return sum + assignedSlots;
  }, 0);

  const totalCapacity = classesArray.reduce((sum, cls) => sum + cls.capacity, 0);
  const capacityPercentage = totalCapacity > 0 ? Math.round((totalEnrollmentSlots / totalCapacity) * 100) : 0;

  // Helper: Get all unique years from programs
  const getUniqueYears = (): number[] => {
    const years = new Set(programs.map((p) => p.year));
    return Array.from(years).sort((a, b) => a - b);
  };

  // Helper: Get analytics for a specific program
  const getProgramAnalytics = (programId: string) => {
    const program = programs.find((p) => p.id === programId);
    if (!program) return null;

    const uniqueStudents = students.filter((s) => {
      if (!s.programEnrollments) return false;
      return s.programEnrollments.some((e) => e.programId === programId && e.status === 'ASSIGNED');
    }).length;

    const enrollmentSlots = students.reduce((sum, s) => {
      if (!s.programEnrollments) return sum;
      const slots = s.programEnrollments.filter(
        (e) => e.programId === programId && e.classId && e.status === 'ASSIGNED'
      ).length;
      return sum + slots;
    }, 0);

    const capacity = classesArray
      .filter((c) => c.programId === programId)
      .reduce((sum, c) => sum + c.capacity, 0);

    const utilization = capacity > 0 ? Math.round((enrollmentSlots / capacity) * 100) : 0;

    return {
      id: programId,
      name: `${program.name} ${program.year}`,
      uniqueStudents,
      enrollmentSlots,
      capacity,
      utilization,
    };
  };

  // Helper: Get analytics for a specific year
  const getYearAnalytics = (year: number) => {
    const yearPrograms = programs.filter((p) => p.year === year);

    const uniqueStudents = new Set<string>();
    const enrollmentSlots = students.reduce((sum, s) => {
      if (!s.programEnrollments) return sum;

      s.programEnrollments.forEach((e) => {
        if (yearPrograms.some((p) => p.id === e.programId) && e.status === 'ASSIGNED') {
          uniqueStudents.add(s.id);
          if (e.classId) {
            sum += 1;
          }
        }
      });
      return sum;
    }, 0);

    const capacity = classesArray
      .filter((c) => yearPrograms.some((p) => p.id === c.programId))
      .reduce((sum, c) => sum + c.capacity, 0);

    const utilization = capacity > 0 ? Math.round((enrollmentSlots / capacity) * 100) : 0;

    return {
      id: `year-${year}`,
      name: `${year}`,
      uniqueStudents: uniqueStudents.size,
      enrollmentSlots,
      capacity,
      utilization,
    };
  };

  // Helper: Get analytics for a specific season
  const getSeasonAnalytics = (season: string) => {
    const seasonPrograms = programs.filter((p) => p.season === season);

    const uniqueStudents = new Set<string>();
    const enrollmentSlots = students.reduce((sum, s) => {
      if (!s.programEnrollments) return sum;

      s.programEnrollments.forEach((e) => {
        if (seasonPrograms.some((p) => p.id === e.programId) && e.status === 'ASSIGNED') {
          uniqueStudents.add(s.id);
          if (e.classId) {
            sum += 1;
          }
        }
      });
      return sum;
    }, 0);

    const capacity = classesArray
      .filter((c) => seasonPrograms.some((p) => p.id === c.programId))
      .reduce((sum, c) => sum + c.capacity, 0);

    const utilization = capacity > 0 ? Math.round((enrollmentSlots / capacity) * 100) : 0;

    return {
      id: `season-${season}`,
      name: season,
      uniqueStudents: uniqueStudents.size,
      enrollmentSlots,
      capacity,
      utilization,
    };
  };

  // Group students by program level (based on their class assignments)
  // If a program is selected, filter students by that program's enrollments
  const getFilteredStudents = (programLevelName: string) => {
    const filteredCount = students.filter((s) => {
      if (!s.programEnrollments || s.programEnrollments.length === 0) return false;

      // Find if student has any class assignment with this program level
      const hasClassInLevel = classesArray.some((cls) => {
        if (cls.programLevel !== programLevelName) return false;

        // Check if student is assigned to this class
        const isAssigned = s.programEnrollments!.some(
          (e) => e.classId === cls.id && e.status === 'ASSIGNED'
        );

        if (!isAssigned) return false;

        // If a specific program is selected, filter by that program
        if (selectedProgram) {
          return cls.programId === selectedProgram;
        }

        return true;
      });

      return hasClassInLevel;
    }).length;

    return filteredCount;
  };

  const programDistribution = {
    'CREATORS': getFilteredStudents('CREATORS'),
    'INNOVATORS': getFilteredStudents('INNOVATORS'),
    'INVENTORS': getFilteredStudents('INVENTORS'),
  };

  // Get total students in the filtered view
  const filteredStudentsCount = selectedProgram
    ? students.filter((s) => s.programEnrollments && s.programEnrollments.some((e) => e.programId === selectedProgram && e.status === 'ASSIGNED')).length
    : Object.values(programDistribution).reduce((sum, count) => sum + count, 0);

  // Build analytics data based on view mode and year filter
  const getAnalyticsData = () => {
    const uniqueYears = getUniqueYears();

    if (analyticsViewMode === 'program') {
      const filteredPrograms =
        analyticsYearFilter === 'all'
          ? programs
          : programs.filter((p) => p.year === parseInt(analyticsYearFilter));

      return filteredPrograms
        .map((p) => getProgramAnalytics(p.id))
        .filter((a) => a !== null);
    }

    if (analyticsViewMode === 'year') {
      return uniqueYears.map((year) => getYearAnalytics(year));
    }

    if (analyticsViewMode === 'season') {
      const seasons = new Set(programs.map((p) => p.season));
      const filteredSeasons =
        analyticsYearFilter === 'all'
          ? Array.from(seasons)
          : Array.from(seasons).filter((season) =>
              programs
                .filter((p) => p.season === season)
                .some((p) => p.year === parseInt(analyticsYearFilter))
            );
      return filteredSeasons.map((season) => getSeasonAnalytics(season));
    }

    return [];
  };

  const analyticsData = getAnalyticsData();
  const uniqueYears = getUniqueYears();

  // Calculate summary totals for the current view
  const getAnalyticsSummary = () => {
    if (analyticsData.length === 0) {
      return { uniqueStudents: 0, enrollmentSlots: 0, capacity: 0, utilization: 0 };
    }

    const uniqueStudents = new Set<string>();
    let totalEnrollmentSlots = 0;
    let totalCapacity = 0;

    // For program and season views, we need to count unique students across all selected items
    if (analyticsViewMode === 'program' || analyticsViewMode === 'season') {
      const filteredPrograms =
        analyticsViewMode === 'program'
          ? analyticsYearFilter === 'all'
            ? programs
            : programs.filter((p) => p.year === parseInt(analyticsYearFilter))
          : analyticsYearFilter === 'all'
          ? programs
          : programs.filter((p) =>
              analyticsData.some((a) => a.id === `season-${p.season}`)
            );

      filteredPrograms.forEach((prog) => {
        students.forEach((student) => {
          if (student.programEnrollments) {
            if (
              student.programEnrollments.some(
                (e) => e.programId === prog.id && e.status === 'ASSIGNED'
              )
            ) {
              uniqueStudents.add(student.id);
            }
          }
        });
      });

      totalEnrollmentSlots = students.reduce((sum, s) => {
        if (!s.programEnrollments) return sum;
        return (
          sum +
          s.programEnrollments.filter((e) => {
            const prog = filteredPrograms.find((p) => p.id === e.programId);
            return prog && e.classId && e.status === 'ASSIGNED';
          }).length
        );
      }, 0);

      totalCapacity = classesArray
        .filter((c) => filteredPrograms.some((p) => p.id === c.programId))
        .reduce((sum, c) => sum + c.capacity, 0);
    } else {
      // For year view, sum up all the data
      analyticsData.forEach((data) => {
        totalEnrollmentSlots += data.enrollmentSlots;
        totalCapacity += data.capacity;
      });

      // Count unique students across all years
      students.forEach((student) => {
        if (student.programEnrollments) {
          if (student.programEnrollments.some((e) => e.status === 'ASSIGNED')) {
            uniqueStudents.add(student.id);
          }
        }
      });
    }

    const utilization =
      totalCapacity > 0 ? Math.round((totalEnrollmentSlots / totalCapacity) * 100) : 0;

    return {
      uniqueStudents: uniqueStudents.size,
      enrollmentSlots: totalEnrollmentSlots,
      capacity: totalCapacity,
      utilization,
    };
  };

  const analyticsSummary = getAnalyticsSummary();

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Students"
          value={totalStudents}
          subtext="total registered"
          variant="primary"
        />
        <StatCard
          label="Unique Enrolled"
          value={totalUniqueEnrolled}
          subtext="students in classes"
          variant="primary"
        />
        <StatCard
          label="Total Classes"
          value={totalClasses}
          subtext={`${totalCapacity} capacity`}
          variant="success"
        />
        <StatCard
          label="Enrollment Slots"
          value={totalEnrollmentSlots}
          subtext={`assigned across classes`}
          variant="primary"
        />
        <StatCard
          label="Enrollment Rate"
          value={`${capacityPercentage}%`}
          subtext={`${totalEnrollmentSlots}/${totalCapacity} spots filled`}
          variant={capacityPercentage < 50 ? 'success' : capacityPercentage < 100 ? 'warning' : 'danger'}
        />
      </div>

      {/* Program & Year Analytics - Super Admin Only */}
      {isSuperAdmin && (
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Program & Year Analytics</h2>
          <div className="flex gap-3">
            <select
              value={analyticsViewMode}
              onChange={(e) => setAnalyticsViewMode(e.target.value as 'program' | 'season' | 'year')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#db3236]"
            >
              <option value="program">By Program</option>
              <option value="season">By Season</option>
              <option value="year">By Year</option>
            </select>
            {analyticsViewMode !== 'year' && (
              <select
                value={analyticsYearFilter}
                onChange={(e) => setAnalyticsYearFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#db3236]"
              >
                <option value="all">All Years</option>
                {uniqueYears.map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Summary Card */}
        {analyticsData.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-blue-50 rounded-lg border-2 border-red-200">
            <p className="text-sm font-semibold text-gray-600 mb-3">
              {analyticsViewMode === 'program'
                ? analyticsYearFilter === 'all'
                  ? 'Total across all programs'
                  : `Total for ${analyticsYearFilter}`
                : analyticsViewMode === 'year'
                ? 'Total across all years'
                : analyticsYearFilter === 'all'
                ? 'Total across all seasons'
                : `Total for seasons in ${analyticsYearFilter}`}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600">Unique Students</p>
                <p className="text-2xl font-bold text-[#db3236]">{analyticsSummary.uniqueStudents}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Enrollment Slots</p>
                <p className="text-2xl font-bold text-[#4885ed]">{analyticsSummary.enrollmentSlots}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Capacity</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsSummary.capacity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsSummary.utilization}%</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticsData.length > 0 ? (
            analyticsData.map((analytics) => {
              let bgColor = 'bg-green-50';
              let borderColor = 'border-green-200';
              let textColor = 'text-green-700';

              if (analytics.utilization >= 90) {
                bgColor = 'bg-red-50';
                borderColor = 'border-red-200';
                textColor = 'text-red-700';
              } else if (analytics.utilization >= 70) {
                bgColor = 'bg-yellow-50';
                borderColor = 'border-yellow-200';
                textColor = 'text-yellow-700';
              }

              return (
                <div key={analytics.id} className={`p-4 ${bgColor} rounded-lg border ${borderColor}`}>
                  <p className="text-sm font-semibold text-gray-900 mb-3">{analytics.name}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Unique Students:</span>
                      <span className="text-lg font-bold text-gray-900">{analytics.uniqueStudents}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Enrollment Slots:</span>
                      <span className="text-lg font-bold text-gray-900">{analytics.enrollmentSlots}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Capacity:</span>
                      <span className="text-lg font-bold text-gray-900">{analytics.capacity}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-300 flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-700">Utilization:</span>
                      <span className={`text-lg font-bold ${textColor}`}>{analytics.utilization}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="col-span-full text-center text-gray-500 py-8">No data available</p>
          )}
        </div>
      </Card>
      )}

      {/* Program Distribution */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Program Distribution</h2>
          <div className="flex gap-2">
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#db3236]"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} - {program.season} {program.year}
                </option>
              ))}
            </select>
            {selectedProgram && (
              <button
                onClick={() => setSelectedProgram('')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(programDistribution).map(([program, count]) => (
            <div key={program} className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{program}</p>
              <p className="text-2xl font-bold text-[#db3236]">{count}</p>
              <p className="text-xs text-gray-500 mt-2">
                {Math.round((count / filteredStudentsCount) * 100) || 0}% of students
              </p>
            </div>
          ))}
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <p className="text-sm text-[#4885ed] font-semibold mb-1">Total Enrolled</p>
            <p className="text-2xl font-bold text-blue-900">{filteredStudentsCount}</p>
            <p className="text-xs text-gray-500 mt-2">
              {selectedProgram ? 'for selected program' : 'across all programs'}
            </p>
          </div>
        </div>
      </Card>

      {/* Financial Metrics Section */}
      {isSuperAdmin && (
        <>
          {/* Revenue Analytics */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Analytics</h2>
            <RevenueAnalytics students={students} programs={programs} />
          </Card>

          {/* Revenue Forecast */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Forecast</h2>
            <RevenueForecast students={students} programs={programs} classes={classesArray} />
          </Card>

          {/* Discount Adoption Analysis */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Discount Adoption Analysis</h2>
            <DiscountAdoptionAnalysis students={students} programs={programs} />
          </Card>
        </>
      )}

      {/* Deeper Insights Section - Comparison Charts */}
      {isSuperAdmin && (
        <>
          {/* Program Comparison */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Program Comparison</h2>
            <ProgramComparison students={students} programs={programs} classes={classesArray} />
          </Card>

          {/* Program History Comparison */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Program History Comparison</h2>
            <ProgramHistoryComparison students={students} programs={programs} classes={classesArray} />
          </Card>

          {/* Year-over-Year Comparison */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Year-over-Year Comparison</h2>
            <YearOverYearComparison students={students} programs={programs} classes={classesArray} />
          </Card>

          {/* Enrollment Trends Chart */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Enrollment Trends</h2>
            <EnrollmentTrendsChartWrapper students={students} programs={programs} />
          </Card>
        </>
      )}

      {/* Quick Stats - Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setDetailsModal({ type: 'unassigned', programFilter: '' })}
          className="text-left hover:shadow-lg transition-shadow"
        >
          <Card>
            <h3 className="font-bold text-gray-900 mb-3">Unassigned Students</h3>
            <p className="text-3xl font-bold text-[#db3236]">
              {students.filter((s) => {
                if (!s.programEnrollments || s.programEnrollments.length === 0) return false;
                // Student is unassigned if they have at least one enrollment without a classId
                return s.programEnrollments.some((e) => e.status === 'ASSIGNED' && !e.classId);
              }).length}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Enrolled in program, awaiting class assignment
            </p>
            <p className="text-xs text-[#db3236] mt-3 font-semibold">Click to view details</p>
          </Card>
        </button>

        <button
          onClick={() => setDetailsModal({ type: 'availability', programFilter: '' })}
          className="text-left hover:shadow-lg transition-shadow"
        >
          <Card>
            <h3 className="font-bold text-gray-900 mb-3">Class Availability</h3>
            <p className="text-3xl font-bold text-green-600">
              {classes.filter((c) => {
                const enrolledCount = students.filter((s) =>
                  s.programEnrollments && s.programEnrollments.some((e) => e.classId === c.id && e.status === 'ASSIGNED')
                ).length;
                return enrolledCount < c.capacity;
              }).length}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Classes with available spots
            </p>
            <p className="text-xs text-green-500 mt-3 font-semibold">Click to view details</p>
          </Card>
        </button>
      </div>

      {/* Details Modal - Unassigned Students */}
      <Modal
        isOpen={detailsModal.type === 'unassigned'}
        onClose={() => setDetailsModal({ type: null, programFilter: '' })}
        title="Unassigned Students"
      >
        <div className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Program</label>
            <select
              value={detailsModal.programFilter}
              onChange={(e) => setDetailsModal({ ...detailsModal, programFilter: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#db3236]"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} - {program.season} {program.year}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {students
              .filter((s) => {
                if (!s.programEnrollments || s.programEnrollments.length === 0) return false;

                if (detailsModal.programFilter) {
                  // Show student only if this specific program enrollment is unassigned
                  return s.programEnrollments.some((e) =>
                    e.programId === detailsModal.programFilter && e.status === 'ASSIGNED' && !e.classId
                  );
                }

                // Show student if they have any unassigned enrollment
                return s.programEnrollments.some((e) => e.status === 'ASSIGNED' && !e.classId);
              })
              .map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setDetailsModal({ type: null, programFilter: '' });
                    onSelectStudent?.(student.id);
                  }}
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-[#db3236] transition-colors cursor-pointer text-left"
                >
                  <p className="font-semibold text-gray-900">{student.firstName} {student.lastName}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {student.email && <>{student.email}</>}
                  </p>
                  {student.dateOfBirth && (
                    <p className="text-xs text-gray-500 mt-1">Age: {calculateAge(student.dateOfBirth)}</p>
                  )}
                </button>
              ))}
            {students.filter((s) => {
              if (!s.programEnrollments || s.programEnrollments.length === 0) return false;

              if (detailsModal.programFilter) {
                return s.programEnrollments.some((e) =>
                  e.programId === detailsModal.programFilter && e.status === 'ASSIGNED' && !e.classId
                );
              }

              return s.programEnrollments.some((e) => e.status === 'ASSIGNED' && !e.classId);
            }).length === 0 && (
              <p className="text-center text-gray-500 py-4">No unassigned students</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Details Modal - Class Availability */}
      <Modal
        isOpen={detailsModal.type === 'availability'}
        onClose={() => setDetailsModal({ type: null, programFilter: '' })}
        title="Classes with Available Spots"
      >
        <div className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Program</label>
            <select
              value={detailsModal.programFilter}
              onChange={(e) => setDetailsModal({ ...detailsModal, programFilter: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#db3236]"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} - {program.season} {program.year}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {classes
              .filter((c) => {
                const enrolledCount = students.filter((s) =>
                  s.programEnrollments && s.programEnrollments.some((e) => e.classId === c.id && e.status === 'ASSIGNED')
                ).length;
                const hasAvailability = enrolledCount < c.capacity;

                if (!hasAvailability) return false;

                if (detailsModal.programFilter) {
                  return c.programId === detailsModal.programFilter;
                }
                return true;
              })
              .map((cls) => {
                const enrolledCount = students.filter((s) =>
                  s.programEnrollments && s.programEnrollments.some((e) => e.classId === cls.id && e.status === 'ASSIGNED')
                ).length;
                const availableSlots = cls.capacity - enrolledCount;

                return (
                  <div key={cls.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-semibold text-gray-900">{cls.name}</p>
                    <p className="text-xs text-gray-600 mt-1">Level: {cls.programLevel}</p>
                    <p className="text-xs text-gray-600">Slot: {cls.slot}</p>
                    <p className="text-xs text-green-700 font-semibold mt-2">
                      {availableSlots} spot{availableSlots !== 1 ? 's' : ''} available ({enrolledCount}/{cls.capacity} enrolled)
                    </p>
                  </div>
                );
              })}
            {classes.filter((c) => {
              const enrolledCount = students.filter((s) =>
                s.programEnrollments && s.programEnrollments.some((e) => e.classId === c.id && e.status === 'ASSIGNED')
              ).length;
              const hasAvailability = enrolledCount < c.capacity;

              if (!hasAvailability) return false;

              if (detailsModal.programFilter) {
                return c.programId === detailsModal.programFilter;
              }
              return true;
            }).length === 0 && (
              <p className="text-center text-gray-500 py-4">No classes with availability</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
