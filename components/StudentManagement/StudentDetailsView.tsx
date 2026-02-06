'use client';

import { useState, useEffect, useRef } from 'react';
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

// Helper function to check if a program can accept new enrollments based on start date
const canEnrollInProgram = (program: any): { allowed: boolean; reason?: string } => {
  if (!program.startDate) {
    return { allowed: false, reason: 'Program start date is missing' };
  }

  const startDate = new Date(program.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (program.type === 'WEEKEND_CLUB') {
    // Weekend clubs: can enroll up to 4 weeks (28 days) after start
    if (daysPassed > 28) {
      return {
        allowed: false,
        reason: `Cannot enroll in weekend programs more than 4 weeks after the start date (${daysPassed} days have passed)`,
      };
    }
  } else if (program.type === 'HOLIDAY_CAMP') {
    // Holiday camps: can enroll up to 5 days after start
    if (daysPassed > 5) {
      return {
        allowed: false,
        reason: `Cannot enroll in holiday programs more than 5 days after the start date (${daysPassed} days have passed)`,
      };
    }
  }

  return { allowed: true };
};

export function StudentDetailsView({ student: initialStudent, onClose, onEdit }: StudentDetailsViewProps) {
  const { classes, updateClass } = useClasses();
  const { programs } = usePrograms();
  const { courses } = useCourses();
  const { updateStudent, students, getStudent } = useStudents();
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentFlow, setEnrollmentFlow] = useState<{ programId: string; programName: string; batches: number } | null>(null);
  const [selectedBatchesForPayment, setSelectedBatchesForPayment] = useState<{ batchNumber: number; paymentConfirmed: boolean }[]>([]);
  const [enrollmentStep, setEnrollmentStep] = useState<'program' | 'batch-payment'>('program');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [displayStudent, setDisplayStudent] = useState<Student>(initialStudent);
  const successMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get the latest student data from SWR cache
  const cachedStudent = getStudent(initialStudent.id);

  useEffect(() => {
    console.log('[StudentDetailsView] cachedStudent changed:', cachedStudent?.id);
    if (cachedStudent) {
      // Only update displayStudent if the cached data has actually changed meaningfully
      // This prevents manual state updates from being overwritten immediately
      const cachedEnrollments = cachedStudent.enrollments || cachedStudent.programEnrollments || [];
      const displayEnrollments = displayStudent.enrollments || displayStudent.programEnrollments || [];

      // Check if enrollments have changed by comparing key properties
      // Treat undefined and null as equivalent for classId
      const enrollmentsChanged = cachedEnrollments.length !== displayEnrollments.length ||
        cachedEnrollments.some((ce, idx) => {
          const de = displayEnrollments[idx];
          return !de || ce.id !== de.id || (ce.classId || null) !== (de.classId || null) || ce.status !== de.status;
        });

      // Also check if course history has changed
      const cachedCourseHistory = cachedStudent.courseHistory || [];
      const displayCourseHistory = displayStudent.courseHistory || [];
      const courseHistoryChanged = cachedCourseHistory.length !== displayCourseHistory.length ||
        cachedCourseHistory.some((ch, idx) => {
          const dh = displayCourseHistory[idx];
          return !dh || ch.id !== dh.id;
        });

      if (enrollmentsChanged || courseHistoryChanged) {
        console.log('[StudentDetailsView] Enrollments or course history have changed. Updating displayStudent with cached data');
        setDisplayStudent(cachedStudent);
      } else {
        console.log('[StudentDetailsView] Data is in sync, not overwriting');
      }
    }
  }, [cachedStudent, displayStudent]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (successMessageTimeoutRef.current) {
        clearTimeout(successMessageTimeoutRef.current);
      }
    };
  }, []);

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

      console.log('[handleUnassignFromClass] Starting unassign process for enrollment:', enrollmentId);
      console.log('[handleUnassignFromClass] Updated enrollments:', updatedEnrollments);

      // Get the class data to find the course being unassigned
      const classData = classes.find((c) => c.id === classId);

      // Remove the IN_PROGRESS course history entry for this class
      const updatedCourseHistory = (student.courseHistory || []).filter((h) => {
        // Keep all course history entries except those that match this class's course and are IN_PROGRESS
        if (classData && h.courseId === classData.courseId && h.completionStatus === 'IN_PROGRESS') {
          console.log('[handleUnassignFromClass] Removing IN_PROGRESS course history for:', h.courseName);
          return false;
        }
        return true;
      });

      console.log('[handleUnassignFromClass] Updated course history:', updatedCourseHistory);

      await updateStudent(studentId, {
        programEnrollments: updatedEnrollments,
        courseHistory: updatedCourseHistory,
      });
      console.log('[handleUnassignFromClass] updateStudent completed');

      // Remove student from the class
      if (classData) {
        await updateClass(classId, {
          students: classData.students.filter((id) => id !== studentId),
        });
        console.log('[handleUnassignFromClass] updateClass completed');
      }

      // Update displayStudent immediately to reflect the change
      const updatedDisplayStudent = {
        ...student,
        enrollments: updatedEnrollments,
        programEnrollments: updatedEnrollments,
        courseHistory: updatedCourseHistory,
      };
      console.log('[handleUnassignFromClass] Updating displayStudent state directly');
      setDisplayStudent(updatedDisplayStudent);

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
      // Remove only this specific batch enrollment
      const enrollmentToRemove = getEnrollments().find((e) => e.id === enrollmentId);
      const updatedEnrollments = getEnrollments().filter((e) => e.id !== enrollmentId);

      // When unassigning from a batch, remove any IN_PROGRESS courses for that batch
      const updatedCourseHistory = (student.courseHistory || []).filter((history) => {
        // Delete IN_PROGRESS entries for this batch
        // Keep all other entries (COMPLETED courses should be preserved)
        if (
          history.programId === programId &&
          history.batch === enrollmentToRemove?.batchNumber &&
          history.completionStatus === 'IN_PROGRESS'
        ) {
          return false; // Delete this entry
        }
        return true; // Keep this entry
      });

      console.log('[handleUnassignFromProgram] Starting unassign process for enrollment:', enrollmentId);
      console.log('[handleUnassignFromProgram] Enrollment batch:', enrollmentToRemove?.batchNumber);
      console.log('[handleUnassignFromProgram] Updated enrollments:', updatedEnrollments);
      console.log('[handleUnassignFromProgram] Updated course history:', updatedCourseHistory.length);

      await updateStudent(studentId, {
        programEnrollments: updatedEnrollments,
        courseHistory: updatedCourseHistory,
      });
      console.log('[handleUnassignFromProgram] updateStudent completed');

      // If the enrollment has a classId, also remove from the class
      if (enrollmentToRemove?.classId) {
        const classData = classes.find((c) => c.id === enrollmentToRemove.classId);
        if (classData) {
          await updateClass(enrollmentToRemove.classId, {
            students: classData.students.filter((id) => id !== studentId),
          });
          console.log('[handleUnassignFromProgram] updateClass completed');
        }
      }

      // Update displayStudent immediately to reflect the change
      const updatedDisplayStudent = {
        ...student,
        enrollments: updatedEnrollments,
        programEnrollments: updatedEnrollments,
        courseHistory: updatedCourseHistory,
      };
      console.log('[handleUnassignFromProgram] Updating displayStudent state directly');
      setDisplayStudent(updatedDisplayStudent);

      // Show success message - indicate it's unassigning from this specific batch
      const programName = programs.find((p) => p.id === programId)?.name || 'Program';
      const batchNumber = enrollmentToRemove?.batchNumber || 1;
      setSuccessMessage(`Removed ${student.firstName} ${student.lastName} from ${programName} - Batch ${batchNumber}`);
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
      // Match by courseId, programId, batch, and completionStatus to handle multiple batches
      const courseHistory = student.courseHistory || [];
      let foundCourseHistory = false;

      const updatedCourseHistory = courseHistory.map((history) => {
        if (
          history.courseId === classData.courseId &&
          history.programId === program.id &&
          history.batch === enrollment.batchNumber &&
          history.completionStatus === 'IN_PROGRESS'
        ) {
          foundCourseHistory = true;
          console.log('[handleMarkAsCompleted] Updating course history entry:', history.id);
          return {
            ...history,
            completionStatus: 'COMPLETED' as const,
            endDate: new Date().toISOString(),
          };
        }
        return history;
      });

      // If no IN_PROGRESS entry was found, create a new COMPLETED entry
      if (!foundCourseHistory) {
        console.log('[handleMarkAsCompleted] No IN_PROGRESS entry found, creating new COMPLETED entry');
        updatedCourseHistory.push({
          id: generateId(),
          courseId: classData.courseId,
          courseName: classData.name || 'Unknown Course',
          programId: program.id,
          programName: program.name,
          batch: enrollment.batchNumber,
          year: program.year,
          completionStatus: 'COMPLETED' as const,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          dateAdded: new Date().toISOString(),
        });
      }

      // Remove the enrollment from programEnrollments
      const updatedEnrollments = getEnrollments().filter((e) => e.id !== enrollmentId);

      console.log('[handleMarkAsCompleted] Starting mark as completed process');
      console.log('[handleMarkAsCompleted] Updated enrollments:', updatedEnrollments);
      console.log('[handleMarkAsCompleted] Updated course history:', updatedCourseHistory);

      // Update student with both changes and mark as returning student since they completed a course
      await updateStudent(studentId, {
        courseHistory: updatedCourseHistory,
        programEnrollments: updatedEnrollments,
        isReturningStudent: true,
      });
      console.log('[handleMarkAsCompleted] updateStudent completed');

      // Remove student from the class
      await updateClass(classId, {
        students: classData.students.filter((id) => id !== studentId),
      });
      console.log('[handleMarkAsCompleted] updateClass completed');

      // Update displayStudent immediately to reflect the change
      const updatedDisplayStudent = {
        ...student,
        enrollments: updatedEnrollments,
        programEnrollments: updatedEnrollments,
        courseHistory: updatedCourseHistory,
        isReturningStudent: true,
      };
      console.log('[handleMarkAsCompleted] Updating displayStudent state directly');
      setDisplayStudent(updatedDisplayStudent);

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
  const handleAssignStudent = (studentId: string, programId: string, batchNumber: number, classId: string) => {
    console.log('[handleAssignStudent] Assigning student to class:', { studentId, programId, batchNumber, classId });

    // Get current enrollments (handle both field names)
    const currentEnrollments = student.enrollments || student.programEnrollments || [];
    console.log('[handleAssignStudent] Current enrollments:', currentEnrollments.length);

    // Validate that the class belongs to the correct batch
    const selectedClassData = classes.find((c) => c.id === classId);
    if (selectedClassData?.batch !== batchNumber) {
      alert(`Selected class is not in Batch ${batchNumber}`);
      return;
    }

    // Check if student is already assigned to this class via any enrollment
    const alreadyAssignedToClass = currentEnrollments.some((e) => e.classId === classId && e.status === 'ASSIGNED');
    if (alreadyAssignedToClass) {
      alert('This student is already assigned to this class.');
      return;
    }

    // Check if payment is confirmed for this program
    const programEnrollment = currentEnrollments.find((e) => e.programId === programId && e.batchNumber === batchNumber);
    console.log('[handleAssignStudent] Found program enrollment:', !!programEnrollment, 'Payment status:', programEnrollment?.paymentStatus);

    if (!programEnrollment || programEnrollment.paymentStatus !== 'CONFIRMED') {
      alert('Cannot assign student to this program. Payment must be confirmed first. Please update the payment status in the Payment Status section.');
      return;
    }

    // Check if student already has a different class assignment for this program/batch
    const existingClassAssignmentForProgram = currentEnrollments.find(
      (e) => e.programId === programId && e.batchNumber === batchNumber && e.classId && e.status === 'ASSIGNED'
    );
    if (existingClassAssignmentForProgram) {
      alert('This student is already assigned to a class in this program. Remove the existing assignment first.');
      return;
    }

    // Update existing enrollment by adding classId - there should always be an enrollment here
    // since we already validated that programEnrollment exists above
    let foundExistingEnrollment = false;
    const updatedEnrollments = currentEnrollments.map((e) => {
      if (e.programId === programId && e.batchNumber === batchNumber) {
        foundExistingEnrollment = true;
        console.log('[handleAssignStudent] Found existing enrollment for program/batch, updating with classId and status ASSIGNED');
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

    // Send enrollment notification emails
    fetch('/api/emails/send-enrollment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId,
        classId,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          console.log('[Email] Enrollment emails sent:', data.emailsSent);

          // Build email notification message
          const emailParts = [];
          if (data.emailsSent.teachers > 0) emailParts.push(`${data.emailsSent.teachers} teacher${data.emailsSent.teachers > 1 ? 's' : ''}`);
          if (data.emailsSent.students > 0) emailParts.push(`${data.emailsSent.students} student${data.emailsSent.students > 1 ? 's' : ''}`);
          if (data.emailsSent.parents > 0) emailParts.push(`${data.emailsSent.parents} parent${data.emailsSent.parents > 1 ? 's' : ''}`);

          if (emailParts.length > 0) {
            const emailSummary = emailParts.join(', ');
            console.log(`[Email] Notification: Emails sent to ${emailSummary}`);
          }
        } else {
          console.warn('[Email] Failed to send enrollment emails:', data.error);
        }
      })
      .catch((error) => {
        console.error('[Email] Error sending enrollment emails:', error);
      });

    // Show success message with email notification
    const className = classData?.name || 'Unknown Class';
    const programName = programs.find((p) => p.id === programId)?.name || 'Unknown Program';
    setSuccessMessage(`✓ Successfully assigned ${student.firstName} ${student.lastName} to ${className} (${programName})\n📧 Notification emails sent to teacher, student, and parent.`);
    setShowSuccessMessage(true);
    setIsAssignmentModalOpen(false);

    // Clear any existing timeout
    if (successMessageTimeoutRef.current) {
      clearTimeout(successMessageTimeoutRef.current);
    }

    // Auto-close success message after 8 seconds to allow reading full message
    successMessageTimeoutRef.current = setTimeout(() => {
      setShowSuccessMessage(false);
      successMessageTimeoutRef.current = null;
    }, 8000);
  };

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900">
              {student.firstName} {student.lastName}
            </h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-sm text-gray-600">Student ID: {student.id.substring(0, 8)}</p>
              {getAssignedClassIds().length > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                  <span>✓</span> {getAssignedClassIds().length} {getAssignedClassIds().length === 1 ? 'assignment' : 'assignments'}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
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
            <>
              <div className="min-w-0">
                <p className="text-xs text-gray-600 font-semibold">Date of Birth</p>
                <p className="text-sm text-gray-900">{new Date(student.dateOfBirth).toLocaleDateString()}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600 font-semibold">Age</p>
                <p className="text-sm text-gray-900">{calculateAge(student.dateOfBirth)} years old</p>
              </div>
            </>
          )}
        </div>

        {/* Parent Contact Section */}
        {(student.parentEmail || student.parentPhone) && (
          <div className="mt-4 pt-4 border-t border-purple-200">
            <p className="text-xs font-semibold text-gray-600 mb-2">Parent/Guardian Contact</p>
            <div className="space-y-1 text-sm">
              {student.parentEmail && <p className="text-gray-700">Email: {student.parentEmail}</p>}
              {student.parentPhone && <p className="text-gray-700">Phone: {student.parentPhone}</p>}
            </div>
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
          onCancel={() => setIsAssignmentModalOpen(false)}
        />
      </Modal>

      {/* Enrollment Modal */}
      <Modal
        isOpen={isEnrollmentModalOpen}
        onClose={() => {
          setIsEnrollmentModalOpen(false);
          setEnrollmentFlow(null);
          setSelectedBatchesForPayment([]);
          setEnrollmentStep('program');
        }}
        title={enrollmentStep === 'program' ? "Enroll Student in Program" : "Confirm Payment Status"}
        size="md"
      >
        <div className="space-y-6">
          {enrollmentStep === 'program' ? (
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
                    // Check which batches student is already enrolled in
                    const enrolledBatches = getEnrollments()
                      .filter((e) => e.programId === program.id && e.status !== 'COMPLETED')
                      .map((e) => e.batchNumber);
                    const allBatchesEnrolled = enrolledBatches.length === program.batches;
                    const enrollmentCheck = canEnrollInProgram(program);
                    const isDisabled = allBatchesEnrolled || !enrollmentCheck.allowed;
                    const disabledReason = allBatchesEnrolled ? 'Enrolled in all batches' : enrollmentCheck.reason;

                    return (
                      <div key={program.id} title={isDisabled ? disabledReason : ''}>
                        <button
                          onClick={() => {
                            if (!isDisabled) {
                              setEnrollmentFlow({
                                programId: program.id,
                                programName: program.name,
                                batches: program.batches
                              });
                              // Initialize batch payment selection
                              const batchesForPayment = Array.from({ length: program.batches }, (_, i) => ({
                                batchNumber: i + 1,
                                paymentConfirmed: false
                              }));
                              setSelectedBatchesForPayment(batchesForPayment);
                              setEnrollmentStep('batch-payment');
                            }
                          }}
                          disabled={isDisabled}
                          className={`w-full p-3 text-left border rounded-lg transition-colors ${
                            isDisabled
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
                              {enrolledBatches.length > 0 && (
                                <p className="text-xs text-amber-600 mt-1">
                                  Already enrolled: Batch{enrolledBatches.length > 1 ? 'es' : ''} {enrolledBatches.join(', ')}
                                </p>
                              )}
                            </div>
                            {isDisabled && (
                              <span className="text-xs font-semibold">
                                {allBatchesEnrolled ? (
                                  <span className="text-gray-600">All enrolled</span>
                                ) : (
                                  <span className="text-red-600">Closed</span>
                                )}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
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

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Confirm Payment Status for Each Batch</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Check which batches the student has made payment for:
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                {selectedBatchesForPayment.map((batch) => (
                  <label key={batch.batchNumber} className="flex items-center gap-3 cursor-pointer hover:bg-yellow-100 p-2 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={batch.paymentConfirmed}
                      onChange={() => {
                        setSelectedBatchesForPayment(
                          selectedBatchesForPayment.map((b) =>
                            b.batchNumber === batch.batchNumber
                              ? { ...b, paymentConfirmed: !b.paymentConfirmed }
                              : b
                          )
                        );
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-yellow-800 font-medium">
                      Batch {batch.batchNumber} - Payment {batch.paymentConfirmed ? '✓ Confirmed' : 'Pending'}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEnrollmentStep('program');
                    setEnrollmentFlow(null);
                    setSelectedBatchesForPayment([]);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const program = programs.find((p) => p.id === enrollmentFlow.programId);
                    if (!program) return;

                    const enrollmentCheck = canEnrollInProgram(program);
                    if (!enrollmentCheck.allowed) {
                      alert(enrollmentCheck.reason);
                      return;
                    }

                    // Create enrollments only for batches with confirmed payment
                    const batchesWithPayment = selectedBatchesForPayment.filter((b) => b.paymentConfirmed);

                    // Only enroll in batches with confirmed payment
                    if (batchesWithPayment.length === 0) {
                      alert('Please confirm payment for at least one batch to proceed.');
                      return;
                    }

                    // Check for duplicate enrollments in selected batches
                    const currentEnrollments = getEnrollments();
                    const courseHistoryItems = student.courseHistory || [];
                    const duplicateBatches: number[] = [];

                    for (const batch of batchesWithPayment) {
                      // Check if already enrolled in this batch
                      const alreadyEnrolled = currentEnrollments.some(
                        (e) => e.programId === enrollmentFlow.programId && e.batchNumber === batch.batchNumber
                      );
                      if (alreadyEnrolled) {
                        duplicateBatches.push(batch.batchNumber);
                        continue;
                      }

                      // Check if already completed this batch
                      const alreadyCompleted = courseHistoryItems.some(
                        (h) => h.programId === enrollmentFlow.programId &&
                               h.batch === batch.batchNumber &&
                               h.completionStatus === 'COMPLETED'
                      );
                      if (alreadyCompleted) {
                        duplicateBatches.push(batch.batchNumber);
                      }
                    }

                    if (duplicateBatches.length > 0) {
                      const batchText = duplicateBatches.length === 1
                        ? `Batch ${duplicateBatches[0]}`
                        : `Batches ${duplicateBatches.join(', ')}`;
                      alert(`Student is already enrolled or completed in ${batchText} of this program.`);
                      return;
                    }

                    const newEnrollments: ProgramEnrollment[] = [];

                    // Add enrollments for batches with confirmed payment (ASSIGNED status - pending class assignment)
                    batchesWithPayment.forEach((batch) => {
                      newEnrollments.push({
                        id: generateId(),
                        programId: enrollmentFlow.programId,
                        batchNumber: batch.batchNumber,
                        enrollmentDate: new Date().toISOString(),
                        status: 'ASSIGNED',
                        paymentStatus: 'CONFIRMED',
                      });
                    });

                    const updatedEnrollments = [...getEnrollments(), ...newEnrollments];
                    updateStudent(student.id, {
                      programEnrollments: updatedEnrollments,
                    });

                    const batchesText = newEnrollments.length === 1
                      ? `Batch ${newEnrollments[0].batchNumber}`
                      : `Batches ${newEnrollments.map((e) => e.batchNumber).join(', ')}`;

                    setSuccessMessage(
                      `✓ Enrolled ${student.firstName} ${student.lastName} in ${enrollmentFlow.programName} - ${batchesText}`
                    );
                    setShowSuccessMessage(true);
                    setTimeout(() => {
                      setShowSuccessMessage(false);
                    }, 3000);

                    setIsEnrollmentModalOpen(false);
                    setEnrollmentFlow(null);
                    setSelectedBatchesForPayment([]);
                    setEnrollmentStep('program');
                  }}
                  disabled={selectedBatchesForPayment.filter((b) => b.paymentConfirmed).length === 0}
                  className="flex-1"
                >
                  Enroll in Selected Batches
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Success Message - Positioned at end to appear on top of modals */}
      {showSuccessMessage && (
        <div className="fixed top-4 left-4 right-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 shadow-lg z-50 max-w-md">
          <span className="text-green-600 text-xl flex-shrink-0">✓</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-green-900 whitespace-pre-line break-words">
              {successMessage}
            </div>
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="text-green-600 hover:text-green-800 text-lg flex-shrink-0 ml-2"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
