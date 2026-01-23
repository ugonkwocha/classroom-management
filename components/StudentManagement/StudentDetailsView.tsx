'use client';

import { useState, useEffect } from 'react';
import { Student, CourseHistory, ProgramEnrollment } from '@/types';
import { useClasses, usePrograms, useCourses, useStudents } from '@/lib/hooks';
import { Card, Button, Modal } from '@/components/ui';
import { CourseHistorySection } from './CourseHistorySection';
import { ProgramEnrollmentsSection } from './ProgramEnrollmentsSection';
import { PaymentStatusSection } from './PaymentStatusSection';
import { AssignmentModal } from './AssignmentModal';
import { generateId, calculateAge } from '@/lib/utils';

interface StudentDetailsViewProps {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
}

export function StudentDetailsView({ student: initialStudent, onClose, onEdit }: StudentDetailsViewProps) {
  const { classes, updateClass } = useClasses();
  const { programs } = usePrograms();
  const { courses } = useCourses();
  const { updateStudent, students, getStudent } = useStudents();
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentFlow, setEnrollmentFlow] = useState<{ programId: string; programName: string } | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [displayStudent, setDisplayStudent] = useState<Student>(initialStudent);

  // Get the latest student data from SWR cache and update whenever it changes
  const cachedStudent = getStudent(initialStudent.id);

  useEffect(() => {
    console.log('[StudentDetailsView] cachedStudent changed:', cachedStudent);
    if (cachedStudent) {
      const enrollments = cachedStudent.enrollments || cachedStudent.programEnrollments || [];
      console.log('[StudentDetailsView] Updating displayStudent with cached data. Enrollments:', enrollments.length);
      setDisplayStudent(cachedStudent);
    }
  }, [cachedStudent]);

  const student = displayStudent;

  // Helper to get enrollments (handles both 'enrollments' and 'programEnrollments' fields)
  const getEnrollments = (s: Student = student): ProgramEnrollment[] => {
    return s.enrollments || s.programEnrollments || [];
  };

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

  // Get list of class IDs the student is already assigned to
  const getAssignedClassIds = (): string[] => {
    return getEnrollments()
      .filter((e) => e.status === 'ASSIGNED' && e.classId)
      .map((e) => e.classId as string);
  };

  // Update payment status for a specific program enrollment
  const handleUpdatePaymentStatus = (enrollmentId: string, paymentStatus: 'PENDING' | 'CONFIRMED' | 'COMPLETED') => {
    const updatedEnrollments = getEnrollments().map((e) =>
      e.id === enrollmentId ? { ...e, paymentStatus } : e
    );
    updateStudent(student.id, { programEnrollments: updatedEnrollments });
  };

  // Unassign student from a class (keep program enrollment)
  const handleUnassignFromClass = async (enrollmentId: string, classId: string, studentId: string) => {
    try {
      // Remove classId from enrollment but keep the program enrollment
      const updatedEnrollments = getEnrollments().map((e) =>
        e.id === enrollmentId ? { ...e, classId: undefined } : e
      );
      await updateStudent(studentId, { programEnrollments: updatedEnrollments });

      // Remove student from the class
      const classData = classes.find((c) => c.id === classId);
      if (classData) {
        await updateClass(classId, {
          students: classData.students.filter((id) => id !== studentId),
        });
      }

      // Show success message
      setSuccessMessage(`Removed ${student.firstName} ${student.lastName} from ${classData?.name || 'the class'}`);
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error('Error unassigning from class:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to unassign from class'}`);
    }
  };

  // Unassign student from a program entirely (remove program enrollment)
  const handleUnassignFromProgram = async (enrollmentId: string, programId: string, studentId: string) => {
    try {
      // Remove the entire program enrollment
      const enrollmentToRemove = getEnrollments().find((e) => e.id === enrollmentId);
      const updatedEnrollments = getEnrollments().filter((e) => e.id !== enrollmentId);

      // Also remove related course history entries for this program
      const updatedCourseHistory = (student.courseHistory || []).filter((h) => h.programId !== programId);

      await updateStudent(studentId, {
        programEnrollments: updatedEnrollments,
        courseHistory: updatedCourseHistory,
      });

      // If the enrollment has a classId, also remove from the class
      if (enrollmentToRemove?.classId) {
        const classData = classes.find((c) => c.id === enrollmentToRemove.classId);
        if (classData) {
          await updateClass(enrollmentToRemove.classId, {
            students: classData.students.filter((id) => id !== studentId),
          });
        }
      }

      // Show success message
      const programName = programs.find((p) => p.id === programId)?.name || 'Program';
      setSuccessMessage(`Removed ${student.firstName} ${student.lastName} from ${programName} (refund/unable to attend)`);
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error('Error unassigning from program:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to unassign from program'}`);
    }
  };

  // Mark a class as completed and add to course history
  const handleMarkAsCompleted = async (enrollmentId: string, classId: string, studentId: string) => {
    try {
      const classData = classes.find((c) => c.id === classId);
      const enrollment = getEnrollments().find((e) => e.id === enrollmentId);
      const program = programs.find((p) => p.id === enrollment?.programId);

      if (!classData || !enrollment || !program) return;

      // Update existing course history entry from "in-progress" to "completed"
      const updatedCourseHistory = (student.courseHistory || []).map((history) => {
        // Find the matching course history entry by matching courseId and programId
        if (history.courseId === classData.courseId && history.programId === program.id && history.completionStatus === 'IN_PROGRESS') {
          console.log('[handleMarkAsCompleted] Updating course history entry:', history.id);
          return {
            ...history,
            completionStatus: 'COMPLETED' as const,
            endDate: new Date().toISOString(),
          };
        }
        return history;
      });

      // Remove the enrollment from programEnrollments
      const updatedEnrollments = getEnrollments().filter((e) => e.id !== enrollmentId);

      // Update student with both changes
      await updateStudent(studentId, {
        courseHistory: updatedCourseHistory,
        programEnrollments: updatedEnrollments,
      });

      // Remove student from the class
      await updateClass(classId, {
        students: classData.students.filter((id) => id !== studentId),
      });

      // Show success message
      setSuccessMessage(`✓ Marked ${classData.name} as completed`);
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error('Error marking class as completed:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to mark class as completed'}`);
    }
  };


  // Add student to waitlist for a program
  const handleAddToWaitlist = (studentId: string, programId: string) => {
    const program = programs.find((p) => p.id === programId);
    if (!program) return;

    // Check if student is already enrolled in this program
    const existingEnrollment = getEnrollments().find((e) => e.programId === programId);
    if (existingEnrollment) {
      alert(`Student is already enrolled in ${program.name}`);
      return;
    }

    // Create new waitlist enrollment
    const newEnrollment: ProgramEnrollment = {
      id: generateId(),
      programId,
      batchNumber: 1,
      enrollmentDate: new Date().toISOString(),
      status: 'WAITLIST',
      paymentStatus: 'PENDING',
    };

    const updatedEnrollments = [...getEnrollments(), newEnrollment];

    updateStudent(studentId, {
      programEnrollments: updatedEnrollments,
    });

    // Show success message
    setSuccessMessage(`✓ Added ${student.firstName} ${student.lastName} to ${program.name} waitlist`);
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  const handleAssignStudent = (studentId: string, programId: string, classId: string) => {
    console.log('[handleAssignStudent] Assigning student to class:', { studentId, programId, classId });

    // Get current enrollments (handle both field names)
    const currentEnrollments = student.enrollments || student.programEnrollments || [];
    console.log('[handleAssignStudent] Current enrollments:', currentEnrollments.length);

    // Check if student is already assigned to this class via any enrollment
    const alreadyAssignedToClass = currentEnrollments.some((e) => e.classId === classId && e.status === 'ASSIGNED');
    if (alreadyAssignedToClass) {
      alert('This student is already assigned to this class.');
      return;
    }

    // Check if payment is confirmed for this program
    const programEnrollment = currentEnrollments.find((e) => e.programId === programId);
    console.log('[handleAssignStudent] Found program enrollment:', !!programEnrollment, 'Payment status:', programEnrollment?.paymentStatus);

    if (!programEnrollment || programEnrollment.paymentStatus !== 'CONFIRMED') {
      alert('Cannot assign student to this program. Payment must be confirmed first. Please update the payment status in the Payment Status section.');
      return;
    }

    // Check if student already has a different class assignment for this program
    const existingClassAssignmentForProgram = currentEnrollments.find(
      (e) => e.programId === programId && e.classId && e.status === 'ASSIGNED'
    );
    if (existingClassAssignmentForProgram) {
      alert('This student is already assigned to a class in this program. Remove the existing assignment first.');
      return;
    }

    // Update existing enrollment by adding classId - there should always be an enrollment here
    // since we already validated that programEnrollment exists above (line 277)
    let foundExistingEnrollment = false;
    const updatedEnrollments = currentEnrollments.map((e) => {
      if (e.programId === programId) {
        foundExistingEnrollment = true;
        console.log('[handleAssignStudent] Found existing enrollment for program, updating with classId and status ASSIGNED');
        return { ...e, classId, status: 'ASSIGNED' as const };
      }
      return e;
    });

    // This should never happen because we already found programEnrollment above
    if (!foundExistingEnrollment) {
      console.error('[handleAssignStudent] ERROR: No existing enrollment found even though programEnrollment was found. This should not happen!');
      alert('An unexpected error occurred. Please refresh and try again.');
      return;
    }

    // Get class and program data for course history
    const classData = classes.find((c) => c.id === classId);
    const program = programs.find((p) => p.id === programId);

    // Create course history entry with "IN_PROGRESS" status
    const newCourseHistory = {
      id: generateId(),
      courseId: classData?.courseId || '',
      courseName: classData?.name || 'Unknown Course',
      programId: program?.id || '',
      programName: program?.name || 'Unknown Program',
      batch: programEnrollment?.batchNumber || 1,
      year: program?.year,
      completionStatus: 'IN_PROGRESS' as const,
      startDate: new Date().toISOString(),
      dateAdded: new Date().toISOString(),
    };

    const updatedCourseHistory = [...(student.courseHistory || []), newCourseHistory];

    console.log('[handleAssignStudent] Calling updateStudent with', updatedEnrollments.length, 'enrollments and', updatedCourseHistory.length, 'course history entries');
    console.log('[handleAssignStudent] Existing course history:', student.courseHistory);
    console.log('[handleAssignStudent] New course history:', updatedCourseHistory);
    updateStudent(studentId, {
      programEnrollments: updatedEnrollments,
      courseHistory: updatedCourseHistory,
    });

    // Add student to class (only if not already added)
    if (classData && !classData.students.includes(studentId)) {
      updateClass(classId, {
        students: [...classData.students, studentId],
      });
    }

    // Show success message
    const className = classData?.name || 'Unknown Class';
    const programName = programs.find((p) => p.id === programId)?.name || 'Unknown Program';
    setSuccessMessage(`Successfully assigned ${student.firstName} ${student.lastName} to ${className} (${programName})`);
    setShowSuccessMessage(true);
    setIsAssignmentModalOpen(false);

    // Auto-close success message after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <span className="text-green-600 text-xl">✓</span>
          <div className="flex-1">
            <p className="font-semibold text-green-900">{successMessage}</p>
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="text-green-600 hover:text-green-800 text-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* Student Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {student.firstName} {student.lastName}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600">Student ID: {student.id.substring(0, 8)}</p>
              {getAssignedClassIds().length > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                  <span>✓</span> {getAssignedClassIds().length} {getAssignedClassIds().length === 1 ? 'assignment' : 'assignments'}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => setIsEnrollmentModalOpen(true)}>
              Enroll to Program
            </Button>
            <Button variant="primary" onClick={() => setIsAssignmentModalOpen(true)}>
              {getAssignedClassIds().length > 0 ? 'Assign Another Class' : 'Assign to Class'}
            </Button>
            <Button variant="outline" onClick={onEdit}>
              Edit Profile
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-600 font-semibold">Email</p>
            <p className="text-sm text-gray-900 break-words">{student.email || 'No email'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-600 font-semibold">Phone</p>
            <p className="text-sm text-gray-900 break-words">{student.phone || 'No phone'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-600 font-semibold">Student Type</p>
            <p className="text-sm text-gray-900">
              {student.isReturningStudent ? '🔄 Returning' : '🆕 New'}
            </p>
          </div>
          {student.dateOfBirth && (
            <div className="min-w-0">
              <p className="text-xs text-gray-600 font-semibold">Age</p>
              <p className="text-sm text-gray-900">{calculateAge(student.dateOfBirth)} years old</p>
            </div>
          )}
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
        courseHistory={student.courseHistory || []}
        getCourseName={getCourseName}
      />

      {/* Payment Status Section */}
      {getEnrollments().length > 0 && (
        <PaymentStatusSection
          enrollments={getEnrollments()}
          programs={programs}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
        />
      )}

      {/* Program Enrollments Section */}
      <ProgramEnrollmentsSection
        enrollments={getEnrollments()}
        classes={classes}
        programs={programs}
        getProgramName={getProgramName}
        getCourseName={getCourseName}
        onUnassignFromClass={handleUnassignFromClass}
        onUnassignFromProgram={handleUnassignFromProgram}
        onMarkAsCompleted={handleMarkAsCompleted}
        studentId={student.id}
      />

      {/* Assignment Modal */}
      <Modal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        title="Manage Student Enrollment"
        size="lg"
      >
        <AssignmentModal
          studentId={student.id}
          studentName={`${student.firstName} ${student.lastName}`}
          programs={programs}
          classes={classes}
          students={students}
          assignedClassIds={getAssignedClassIds()}
          courseHistory={student.courseHistory || []}
          studentProgramEnrollments={getEnrollments()}
          onAssign={handleAssignStudent}
          onAddToWaitlist={handleAddToWaitlist}
          onCancel={() => setIsAssignmentModalOpen(false)}
        />
      </Modal>

      {/* Enrollment Modal */}
      <Modal
        isOpen={isEnrollmentModalOpen}
        onClose={() => {
          setIsEnrollmentModalOpen(false);
          setEnrollmentFlow(null);
          setPaymentConfirmed(false);
        }}
        title={enrollmentFlow ? "Confirm Payment Status" : "Enroll Student in Program"}
        size="md"
      >
        <div className="space-y-6">
          {!enrollmentFlow ? (
            <>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Select a Program</h3>
                <p className="text-sm text-gray-600">
                  Enroll <span className="font-semibold">{student.firstName} {student.lastName}</span> in an upcoming program.
                </p>
              </div>

              {programs.length === 0 ? (
                <p className="text-gray-500 text-sm">No programs available.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {programs.map((program) => {
                    const isAlreadyEnrolled = getEnrollments().some((e) => e.programId === program.id);
                    return (
                      <button
                        key={program.id}
                        onClick={() => {
                          if (!isAlreadyEnrolled) {
                            setEnrollmentFlow({ programId: program.id, programName: program.name });
                          }
                        }}
                        disabled={isAlreadyEnrolled}
                        className={`w-full p-3 text-left border rounded-lg transition-colors ${
                          isAlreadyEnrolled
                            ? 'border-gray-300 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-300 hover:bg-purple-50 hover:border-purple-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {program.name} - {program.season} {program.year}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Type: {program.type} | Batches: {program.batches}
                            </p>
                          </div>
                          {isAlreadyEnrolled && (
                            <span className="text-xs text-gray-600 font-semibold">Enrolled</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEnrollmentModalOpen(false);
                    setEnrollmentFlow(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Selected Program:</span> {enrollmentFlow.programName}
                </p>
              </div>

              <h4 className="font-semibold text-gray-900">Confirm Payment Status</h4>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-semibold mb-3">
                  Has the student made payment for this program?
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value="confirmed"
                      checked={paymentConfirmed === true}
                      onChange={() => setPaymentConfirmed(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-yellow-800">
                      Yes, payment has been confirmed
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value="pending"
                      checked={paymentConfirmed === false}
                      onChange={() => setPaymentConfirmed(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-yellow-800">
                      No, payment is pending
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEnrollmentFlow(null);
                    setPaymentConfirmed(false);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                {!paymentConfirmed ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      const newEnrollment: ProgramEnrollment = {
                        id: generateId(),
                        programId: enrollmentFlow.programId,
                        batchNumber: 1,
                        enrollmentDate: new Date().toISOString(),
                        status: 'WAITLIST',
                        paymentStatus: 'PENDING',
                      };

                      const updatedEnrollments = [...getEnrollments(), newEnrollment];
                      updateStudent(student.id, {
                        programEnrollments: updatedEnrollments,
                      });

                      setSuccessMessage(
                        `✓ Added ${student.firstName} ${student.lastName} to ${enrollmentFlow.programName} waitlist (Payment pending)`
                      );
                      setShowSuccessMessage(true);
                      setTimeout(() => {
                        setShowSuccessMessage(false);
                      }, 3000);

                      setIsEnrollmentModalOpen(false);
                      setEnrollmentFlow(null);
                      setPaymentConfirmed(false);
                    }}
                    className="flex-1"
                  >
                    Add to Waitlist
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const newEnrollment: ProgramEnrollment = {
                          id: generateId(),
                          programId: enrollmentFlow.programId,
                          batchNumber: 1,
                          enrollmentDate: new Date().toISOString(),
                          status: 'WAITLIST',
                          paymentStatus: 'CONFIRMED',
                        };

                        const updatedEnrollments = [...getEnrollments(), newEnrollment];
                        updateStudent(student.id, {
                          programEnrollments: updatedEnrollments,
                        });

                        setSuccessMessage(
                          `✓ Enrolled ${student.firstName} ${student.lastName} in ${enrollmentFlow.programName} (Payment confirmed)`
                        );
                        setShowSuccessMessage(true);
                        setTimeout(() => {
                          setShowSuccessMessage(false);
                        }, 3000);

                        setIsEnrollmentModalOpen(false);
                        setEnrollmentFlow(null);
                        setPaymentConfirmed(false);
                      }}
                      className="flex-1"
                    >
                      Add to Waitlist
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        // Create enrollment for the program with CONFIRMED payment and ASSIGNED status
                        // This creates a "Pending Class Assignment" entry, matching student creation process
                        const newEnrollment: ProgramEnrollment = {
                          id: generateId(),
                          programId: enrollmentFlow.programId,
                          batchNumber: 1,
                          enrollmentDate: new Date().toISOString(),
                          status: 'ASSIGNED',
                          paymentStatus: 'CONFIRMED',
                        };

                        const updatedEnrollments = [...getEnrollments(), newEnrollment];
                        updateStudent(student.id, {
                          programEnrollments: updatedEnrollments,
                        });

                        setIsEnrollmentModalOpen(false);
                        setEnrollmentFlow(null);
                        setPaymentConfirmed(false);

                        // Open assignment modal to select a class
                        // The student now has an enrollment for this program with CONFIRMED payment
                        // and can be assigned to a class immediately
                        setTimeout(() => {
                          setIsAssignmentModalOpen(true);
                        }, 100);
                      }}
                      className="flex-1"
                    >
                      Assign to Class
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
