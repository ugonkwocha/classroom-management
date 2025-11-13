'use client';

import { ProgramEnrollment, Class, Program } from '@/types';
import { Card } from '@/components/ui';

interface ProgramEnrollmentsSectionProps {
  enrollments: ProgramEnrollment[];
  classes: Class[];
  programs: Program[];
  getProgramName: (programId: string) => string;
  getCourseName: (courseId: string) => string;
}

export function ProgramEnrollmentsSection({
  enrollments,
  classes,
  programs,
  getProgramName,
  getCourseName,
}: ProgramEnrollmentsSectionProps) {
  if (enrollments.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Program Enrollments</h3>
        <p className="text-gray-600 text-center py-6">
          This student hasn't been enrolled in any programs yet.
        </p>
      </Card>
    );
  }

  const assignedCount = enrollments.filter((e) => e.status === 'assigned').length;
  const waitlistCount = enrollments.filter((e) => e.status === 'waitlist').length;
  const completedCount = enrollments.filter((e) => e.status === 'completed').length;
  const droppedCount = enrollments.filter((e) => e.status === 'dropped').length;

  return (
    <Card>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Program Enrollments</h3>
          <p className="text-sm text-gray-600 mt-1">
            {enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <p className="font-bold text-green-600">{assignedCount}</p>
            <p className="text-gray-600 text-xs">Assigned</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-amber-600">{waitlistCount}</p>
            <p className="text-gray-600 text-xs">Waitlist</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-blue-600">{completedCount}</p>
            <p className="text-gray-600 text-xs">Completed</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-red-600">{droppedCount}</p>
            <p className="text-gray-600 text-xs">Dropped</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {enrollments.map((enrollment) => {
          const program = programs.find((p) => p.id === enrollment.programId);
          const classData = enrollment.classId
            ? classes.find((c) => c.id === enrollment.classId)
            : null;

          const statusColor =
            enrollment.status === 'assigned'
              ? 'bg-green-50 border-green-200'
              : enrollment.status === 'waitlist'
              ? 'bg-amber-50 border-amber-200'
              : enrollment.status === 'completed'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-red-50 border-red-200';

          const statusBadgeColor =
            enrollment.status === 'assigned'
              ? 'bg-green-200 text-green-800'
              : enrollment.status === 'waitlist'
              ? 'bg-amber-200 text-amber-800'
              : enrollment.status === 'completed'
              ? 'bg-blue-200 text-blue-800'
              : 'bg-red-200 text-red-800';

          const statusLabel =
            enrollment.status === 'assigned'
              ? 'Assigned'
              : enrollment.status === 'waitlist'
              ? 'On Waitlist'
              : enrollment.status === 'completed'
              ? 'Completed'
              : 'Dropped';

          return (
            <div key={enrollment.id} className={`p-4 rounded-lg border ${statusColor}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {getProgramName(enrollment.programId)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Batch {enrollment.batchNumber}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadgeColor}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Class Assignment Details */}
              {classData && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-2">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">Class</p>
                    <p className="text-sm text-gray-900 font-medium">{classData.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-600">Course</p>
                      <p className="text-gray-900">{getCourseName(classData.courseId)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Time Slot</p>
                      <p className="text-gray-900">{classData.slot}</p>
                    </div>
                  </div>
                  {classData.teacherId && (
                    <div>
                      <p className="text-xs text-gray-600">Instructor Assigned</p>
                      <p className="text-sm text-gray-900">✓ Yes</p>
                    </div>
                  )}
                </div>
              )}

              {/* Enrollment Date */}
              <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                <p className="text-xs text-gray-600">
                  Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
