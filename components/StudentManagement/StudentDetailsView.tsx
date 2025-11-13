'use client';

import { Student, CourseHistory, ProgramEnrollment } from '@/types';
import { useClasses, usePrograms, useCourses } from '@/lib/hooks';
import { Card, Button } from '@/components/ui';
import { CourseHistorySection } from './CourseHistorySection';
import { ProgramEnrollmentsSection } from './ProgramEnrollmentsSection';

interface StudentDetailsViewProps {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
}

export function StudentDetailsView({ student, onClose, onEdit }: StudentDetailsViewProps) {
  const { classes } = useClasses();
  const { programs } = usePrograms();
  const { courses } = useCourses();

  // Get full names of courses from IDs
  const getCourseName = (courseId: string): string => {
    const course = courses.find((c) => c.id === courseId);
    return course?.name || 'Unknown Course';
  };

  // Get full names of programs from IDs
  const getProgramName = (programId: string): string => {
    const program = programs.find((p) => p.id === programId);
    return program ? `${program.name} - ${program.season} ${program.year}` : 'Unknown Program';
  };

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {student.firstName} {student.lastName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">Student ID: {student.id.substring(0, 8)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onEdit}>
              Edit Profile
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-600 font-semibold">Email</p>
            <p className="text-sm text-gray-900">{student.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-semibold">Phone</p>
            <p className="text-sm text-gray-900">{student.phone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-semibold">Payment Status</p>
            <p className={`text-sm font-semibold ${
              student.paymentStatus === 'completed' ? 'text-green-600' :
              student.paymentStatus === 'confirmed' ? 'text-blue-600' :
              'text-amber-600'
            }`}>
              {student.paymentStatus.charAt(0).toUpperCase() + student.paymentStatus.slice(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-semibold">Student Type</p>
            <p className="text-sm text-gray-900">
              {student.isReturningStudent ? '🔄 Returning' : '🆕 New'}
            </p>
          </div>
        </div>

        {/* Parent Contact (if available) */}
        {(student.parentEmail || student.parentPhone) && (
          <div className="mt-4 pt-4 border-t border-purple-200">
            <p className="text-xs font-semibold text-gray-600 mb-2">Parent/Guardian Contact</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {student.parentEmail && <p className="text-gray-700">Email: {student.parentEmail}</p>}
              {student.parentPhone && <p className="text-gray-700">Phone: {student.parentPhone}</p>}
            </div>
          </div>
        )}

        {/* Date of Birth (if available) */}
        {student.dateOfBirth && (
          <div className="mt-2 text-sm text-gray-600">
            <p>Date of Birth: {new Date(student.dateOfBirth).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {/* Course History Section */}
      <CourseHistorySection
        courseHistory={student.courseHistory}
        getCourseName={getCourseName}
      />

      {/* Program Enrollments Section */}
      <ProgramEnrollmentsSection
        enrollments={student.programEnrollments}
        classes={classes}
        programs={programs}
        getProgramName={getProgramName}
        getCourseName={getCourseName}
      />
    </div>
  );
}
