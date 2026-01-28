'use client';

import { useState } from 'react';
import { useStudents, useClasses, useWaitlist, usePrograms } from '@/lib/hooks';
import { Card, Modal } from '@/components/ui';
import { StatCard } from './StatCard';
import { calculateAge, getProgramLevel } from '@/lib/utils';

interface DashboardProps {
  onSelectStudent?: (studentId: string) => void;
}

export function Dashboard({ onSelectStudent }: DashboardProps) {
  const { students, isLoaded: studentsLoaded } = useStudents();
  const { classes, isLoaded: classesLoaded } = useClasses();
  const { waitlist, isLoaded: waitlistLoaded } = useWaitlist();
  const { programs } = usePrograms();
  const [selectedProgram, setSelectedProgram] = useState<string>(''); // Filter by program
  const [detailsModal, setDetailsModal] = useState<{ type: 'unassigned' | 'availability' | null; programFilter: string }>({ type: null, programFilter: '' });

  if (!studentsLoaded || !classesLoaded || !waitlistLoaded) {
    return <div>Loading...</div>;
  }

  const totalStudents = students.length;
  const classesArray = Array.isArray(classes) ? classes : [];
  const totalClasses = classesArray.length;

  // Calculate actual enrolled students (respecting capacity limits)
  let totalEnrolled = 0;
  classesArray.forEach((cls) => {
    const enrolledInClass = students.filter((s) =>
      s.programEnrollments && s.programEnrollments.some((e) => e.classId === cls.id && e.status === 'ASSIGNED')
    ).length;
    totalEnrolled += Math.min(enrolledInClass, cls.capacity);
  });

  const waitlistCount = waitlist.length;
  const totalCapacity = classesArray.reduce((sum, cls) => sum + cls.capacity, 0);
  const capacityPercentage = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  // Group students by program level (based on their age)
  // If a program is selected, filter students by that program's enrollments
  const getFilteredStudents = (programLevelName: string) => {
    return students.filter((s) => {
      if (!s.dateOfBirth) return false;
      const age = calculateAge(s.dateOfBirth);
      try {
        const studentLevel = getProgramLevel(age);
        if (studentLevel !== programLevelName) return false;

        if (!s.programEnrollments || s.programEnrollments.length === 0) return false;

        // If a specific program is selected, filter by that program
        if (selectedProgram) {
          return s.programEnrollments.some((e) => e.programId === selectedProgram);
        }

        return true;
      } catch {
        return false;
      }
    }).length;
  };

  const programDistribution = {
    'CREATORS': getFilteredStudents('CREATORS'),
    'INNOVATORS': getFilteredStudents('INNOVATORS'),
    'INVENTORS': getFilteredStudents('INVENTORS'),
  };

  // Get total students in the filtered view
  const filteredStudentsCount = selectedProgram
    ? students.filter((s) => s.programEnrollments && s.programEnrollments.some((e) => e.programId === selectedProgram)).length
    : Object.values(programDistribution).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={totalStudents}
          subtext={`${totalEnrolled} enrolled`}
          variant="primary"
        />
        <StatCard
          label="Total Classes"
          value={totalClasses}
          subtext={`${totalCapacity} capacity`}
          variant="success"
        />
        <StatCard
          label="Enrollment Rate"
          value={`${capacityPercentage}%`}
          subtext={`${totalEnrolled}/${totalCapacity} spots filled`}
          variant={capacityPercentage < 50 ? 'success' : capacityPercentage < 100 ? 'warning' : 'danger'}
        />
        <StatCard
          label="Waitlist"
          value={waitlistCount}
          subtext="Waiting for placement"
          variant={waitlistCount > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Program Distribution */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Program Distribution</h2>
          <div className="flex gap-2">
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            <div key={program} className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{program}</p>
              <p className="text-2xl font-bold text-purple-600">{count}</p>
              <p className="text-xs text-gray-500 mt-2">
                {Math.round((count / filteredStudentsCount) * 100) || 0}% of students
              </p>
            </div>
          ))}
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <p className="text-sm text-blue-600 font-semibold mb-1">Total Enrolled</p>
            <p className="text-2xl font-bold text-blue-900">{filteredStudentsCount}</p>
            <p className="text-xs text-gray-500 mt-2">
              {selectedProgram ? 'for selected program' : 'across all programs'}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setDetailsModal({ type: 'unassigned', programFilter: '' })}
          className="text-left hover:shadow-lg transition-shadow"
        >
          <Card>
            <h3 className="font-bold text-gray-900 mb-3">Unassigned Students</h3>
            <p className="text-3xl font-bold text-purple-600">
              {students.filter((s) => {
                if (!s.programEnrollments || s.programEnrollments.length === 0) return false;
                // Student is unassigned if they have at least one enrollment without a classId
                return s.programEnrollments.some((e) => e.status === 'ASSIGNED' && !e.classId);
              }).length}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Enrolled in program, awaiting class assignment
            </p>
            <p className="text-xs text-purple-500 mt-3 font-semibold">Click to view details</p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-colors cursor-pointer text-left"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
