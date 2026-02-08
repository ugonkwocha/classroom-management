'use client';

import { useState } from 'react';
import { ProgramEnrollment, Class, Program, PriceType } from '@/types';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { PriceEditModal } from './PriceEditModal';
import { getPriceLabel, formatCurrency } from '@/lib/constants/pricing';

interface ProgramEnrollmentsSectionProps {
  enrollments: ProgramEnrollment[];
  classes: Class[];
  programs: Program[];
  getProgramName: (programId: string) => string;
  getCourseName: (courseId: string) => string;
  onUnassignFromClass?: (enrollmentId: string, classId: string, studentId: string) => void;
  onUnassignFromProgram?: (enrollmentId: string, programId: string, studentId: string) => void;
  onMarkAsCompleted?: (enrollmentId: string, classId: string, studentId: string) => void;
  onEditPrice?: (enrollmentId: string, priceType: PriceType, priceAmount: number) => Promise<void>;
  studentId?: string;
}

export function ProgramEnrollmentsSection({
  enrollments,
  classes,
  programs,
  getProgramName,
  getCourseName,
  onUnassignFromClass,
  onUnassignFromProgram,
  onMarkAsCompleted,
  onEditPrice,
  studentId,
}: ProgramEnrollmentsSectionProps) {
  const { user } = useAuth();
  const canEditPrice = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const [priceModalState, setPriceModalState] = useState<{ isOpen: boolean; enrollmentId: string | null }>({
    isOpen: false,
    enrollmentId: null,
  });

  const selectedEnrollment = priceModalState.enrollmentId
    ? enrollments.find((e) => e.id === priceModalState.enrollmentId)
    : null;
  const selectedProgram = selectedEnrollment ? programs.find((p) => p.id === selectedEnrollment.programId) : null;
  // Separate enrollments: those with class assignment, pending (ASSIGNED without classId), and those on waitlist
  const classEnrollments = enrollments.filter((e) => e.classId);
  const pendingEnrollments = enrollments.filter((e) => e.status === 'ASSIGNED' && !e.classId);
  const waitlistEnrollments = enrollments.filter((e) => e.status === 'WAITLIST' && !e.classId);

  if (classEnrollments.length === 0 && pendingEnrollments.length === 0 && waitlistEnrollments.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Class Assignments</h3>
        <p className="text-gray-600 text-center py-6">
          This student hasn&apos;t been assigned to any classes yet.
        </p>
      </Card>
    );
  }

  const assignedCount = classEnrollments.filter((e) => e.status === 'ASSIGNED').length;
  const waitlistCount = enrollments.filter((e) => e.status === 'WAITLIST').length;
  const completedCount = classEnrollments.filter((e) => e.status === 'COMPLETED').length;

  return (
    <Card>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Class Assignments</h3>
          <p className="text-sm text-gray-600 mt-1">
            {classEnrollments.length} assignment{classEnrollments.length !== 1 ? 's' : ''}
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
        </div>
      </div>

      <div className="space-y-3">
        {classEnrollments.map((enrollment) => {
          const program = programs.find((p) => p.id === enrollment.programId);
          const classData = enrollment.classId
            ? classes.find((c) => c.id === enrollment.classId)
            : null;

          const statusColor =
            enrollment.status === 'ASSIGNED'
              ? 'bg-green-50 border-green-200'
              : enrollment.status === 'WAITLIST'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200';

          const statusBadgeColor =
            enrollment.status === 'ASSIGNED'
              ? 'bg-green-200 text-green-800'
              : enrollment.status === 'WAITLIST'
              ? 'bg-amber-200 text-amber-800'
              : 'bg-blue-200 text-blue-800';

          const statusLabel =
            enrollment.status === 'ASSIGNED'
              ? 'Assigned'
              : enrollment.status === 'WAITLIST'
              ? 'On Waitlist'
              : 'Completed';

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

              {/* Pricing Information */}
              {enrollment.priceType && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Price</p>
                      <p className="text-sm text-gray-900">{getPriceLabel(enrollment.priceType)}</p>
                    </div>
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(enrollment.priceAmount || 60000)}
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Status */}
              {enrollment.paymentStatus && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 font-semibold">Payment Status</p>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      enrollment.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      enrollment.paymentStatus === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {enrollment.paymentStatus === 'CONFIRMED' && '✓ Confirmed'}
                      {enrollment.paymentStatus === 'PENDING' && '⏳ Pending'}
                      {enrollment.paymentStatus === 'COMPLETED' && '✓ Completed'}
                    </span>
                  </div>
                </div>
              )}

              {/* Enrollment Date */}
              <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                <p className="text-xs text-gray-600">
                  Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-current border-opacity-20 space-y-2">
                {canEditPrice && onEditPrice && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPriceModalState({ isOpen: true, enrollmentId: enrollment.id })}
                    className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    Edit Price
                  </Button>
                )}
                {onMarkAsCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (window.confirm(`Mark ${classData?.name || 'this course'} as completed? This will add it to the student's course history.`)) {
                        await onMarkAsCompleted(enrollment.id, classData?.id || '', studentId || '');
                      }
                    }}
                    className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    ✓ Mark as Completed
                  </Button>
                )}
                <div className="flex gap-2">
                  {classData && onUnassignFromClass && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (window.confirm(`Remove ${classData.name} assignment? The student will remain enrolled in the program.`)) {
                          await onUnassignFromClass(enrollment.id, classData.id, studentId || '');
                        }
                      }}
                      className="flex-1"
                    >
                      Unassign from Class
                    </Button>
                  )}
                  {onUnassignFromProgram && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (window.confirm(`Remove ${getProgramName(enrollment.programId)} - Batch ${enrollment.batchNumber} enrollment? This cannot be undone.`)) {
                          await onUnassignFromProgram(enrollment.id, enrollment.programId, studentId || '');
                        }
                      }}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Unassign from Batch
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Enrollments Section - Students with pending assignments should use the "Assign to Class" button above */}
      {pendingEnrollments.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-bold text-gray-900 mb-4">Pending Class Assignment ({pendingEnrollments.length})</h4>
          <div className="space-y-3">
            {pendingEnrollments.map((enrollment) => {
              return (
                <div key={enrollment.id} className="p-4 rounded-lg border bg-purple-50 border-purple-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {getProgramName(enrollment.programId)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Batch {enrollment.batchNumber}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-200 text-purple-800">
                      Pending Assignment
                    </span>
                  </div>

                  {/* Enrollment Date */}
                  <div className="mb-4 pt-3 border-t border-purple-200">
                    <p className="text-xs text-gray-600">
                      Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Pricing Information */}
                  {enrollment.priceType && (
                    <div className="mb-4 pt-3 border-t border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">Price</p>
                          <p className="text-sm text-gray-900">{getPriceLabel(enrollment.priceType)}</p>
                        </div>
                        <p className="text-lg font-bold text-purple-600">
                          {formatCurrency(enrollment.priceAmount || 60000)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Payment Status */}
                  {enrollment.paymentStatus && (
                    <div className="mb-4 pt-3 border-t border-purple-200">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600 font-semibold">Payment Status</p>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          enrollment.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          enrollment.paymentStatus === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {enrollment.paymentStatus === 'CONFIRMED' && '✓ Confirmed'}
                          {enrollment.paymentStatus === 'PENDING' && '⏳ Pending'}
                          {enrollment.paymentStatus === 'COMPLETED' && '✓ Completed'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Info Message */}
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <p className="text-sm text-gray-600">
                      Use the <span className="font-semibold">&quot;Assign to Class&quot;</span> button above to assign this student to an available class.
                    </p>
                  </div>

                  {/* Unassign Option */}
                  {onUnassignFromProgram && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Remove ${getProgramName(enrollment.programId)} - Batch ${enrollment.batchNumber} enrollment? This cannot be undone.`)) {
                            onUnassignFromProgram(enrollment.id, enrollment.programId, studentId || '');
                          }
                        }}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove Batch Enrollment
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Waitlist Section */}
      {waitlistEnrollments.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-bold text-gray-900 mb-4">Waitlist ({waitlistEnrollments.length})</h4>
          <div className="space-y-3">
            {waitlistEnrollments.map((enrollment) => {
              const program = programs.find((p) => p.id === enrollment.programId);
              const availableClasses = classes.filter((c) => {
                // Show classes for this program that haven't reached capacity
                return (
                  c.programId === enrollment.programId &&
                  !c.isArchived &&
                  c.students.length < c.capacity
                );
              });

              return (
                <div key={enrollment.id} className="p-4 rounded-lg border bg-amber-50 border-amber-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {getProgramName(enrollment.programId)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Batch {enrollment.batchNumber}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-200 text-amber-800">
                      On Waitlist
                    </span>
                  </div>

                  {/* Enrollment Date */}
                  <div className="mb-4 pt-3 border-t border-amber-200">
                    <p className="text-xs text-gray-600">
                      Waitlisted: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Payment Status */}
                  {enrollment.paymentStatus && (
                    <div className="mb-4 pt-3 border-t border-amber-200">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600 font-semibold">Payment Status</p>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          enrollment.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          enrollment.paymentStatus === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {enrollment.paymentStatus === 'CONFIRMED' && '✓ Confirmed'}
                          {enrollment.paymentStatus === 'PENDING' && '⏳ Pending'}
                          {enrollment.paymentStatus === 'COMPLETED' && '✓ Completed'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Info message directing to Assign to Class button */}
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <p className="text-sm text-gray-600 italic">To assign this student to a class, use the &quot;Assign to Class&quot; button at the top of the modal.</p>
                  </div>

                  {/* Unassign Option */}
                  {onUnassignFromProgram && (
                    <div className="mt-3 pt-3 border-t border-amber-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (window.confirm(`Remove ${getProgramName(enrollment.programId)} - Batch ${enrollment.batchNumber} enrollment? This cannot be undone.`)) {
                            await onUnassignFromProgram(enrollment.id, enrollment.programId, studentId || '');
                          }
                        }}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove from Batch Waitlist
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Edit Modal */}
      {canEditPrice && (
        <PriceEditModal
          isOpen={priceModalState.isOpen}
          onClose={() => setPriceModalState({ isOpen: false, enrollmentId: null })}
          student={selectedEnrollment ? { id: studentId || '', ...({} as any) } : null}
          enrollment={selectedEnrollment || null}
          program={selectedProgram || null}
          onSave={async (enrollmentId, priceType, priceAmount) => {
            if (onEditPrice) {
              await onEditPrice(enrollmentId, priceType, priceAmount);
            }
            setPriceModalState({ isOpen: false, enrollmentId: null });
          }}
        />
      )}
    </Card>
  );
}
