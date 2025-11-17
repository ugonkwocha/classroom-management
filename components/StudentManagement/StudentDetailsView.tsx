'use client';

import { useState } from 'react';
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

export function StudentDetailsView({ student, onClose, onEdit }: StudentDetailsViewProps) {
  const { classes, updateClass } = useClasses();
  const { programs } = usePrograms();
  const { courses } = useCourses();
  const { updateStudent, students } = useStudents();
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
    return (student.programEnrollments || [])
      .filter((e) => e.status === 'assigned' && e.classId)
      .map((e) => e.classId as string);
  };

  // Update payment status for a specific program enrollment
  const handleUpdatePaymentStatus = (enrollmentId: string, paymentStatus: 'pending' | 'confirmed' | 'completed') => {
    const updatedEnrollments = (student.programEnrollments || []).map((e) =>
      e.id === enrollmentId ? { ...e, paymentStatus } : e
    );
    updateStudent(student.id, { programEnrollments: updatedEnrollments });
  };

  // Unassign student from a class (keep program enrollment)
  const handleUnassignFromClass = (enrollmentId: string, classId: string, studentId: string) => {
    // Remove classId from enrollment but keep the program enrollment
    const updatedEnrollments = (student.programEnrollments || []).map((e) =>
      e.id === enrollmentId ? { ...e, classId: undefined } : e
    );
    updateStudent(studentId, { programEnrollments: updatedEnrollments });

    // Remove student from the class
    const classData = classes.find((c) => c.id === classId);
    if (classData) {
      updateClass(classId, {
        students: classData.students.filter((id) => id !== studentId),
      });
    }

    // Show success message
    setSuccessMessage(`Removed ${student.firstName} ${student.lastName} from ${classData?.name || 'the class'}`);
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  // Unassign student from a program entirely (remove program enrollment)
  const handleUnassignFromProgram = (enrollmentId: string, programId: string, studentId: string) => {
    // Remove the entire program enrollment
    const enrollmentToRemove = student.programEnrollments?.find((e) => e.id === enrollmentId);
    const updatedEnrollments = (student.programEnrollments || []).filter((e) => e.id !== enrollmentId);
    updateStudent(studentId, { programEnrollments: updatedEnrollments });

    // If the enrollment has a classId, also remove from the class
    if (enrollmentToRemove?.classId) {
      const classData = classes.find((c) => c.id === enrollmentToRemove.classId);
      if (classData) {
        updateClass(enrollmentToRemove.classId, {
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
  };

  // Mark a class as completed and add to course history
  const handleMarkAsCompleted = (enrollmentId: string, classId: string, studentId: string) => {
    const classData = classes.find((c) => c.id === classId);
    const enrollment = student.programEnrollments?.find((e) => e.id === enrollmentId);
    const program = programs.find((p) => p.id === enrollment?.programId);

    if (!classData || !enrollment || !program) return;

    // Create course history entry
    const newCourseHistory = {
      id: generateId(),
      courseId: classData.courseId,
      courseName: classData.name,
      programId: program.id,
      programName: program.name,
      batch: enrollment.batchNumber,
      year: program.year,
      completionStatus: 'completed' as const,
      startDate: enrollment.enrollmentDate,
      endDate: new Date().toISOString(),
    };

    // Add to student's course history
    const updatedCourseHistory = [...(student.courseHistory || []), newCourseHistory];

    // Remove the enrollment from programEnrollments
    const updatedEnrollments = (student.programEnrollments || []).filter((e) => e.id !== enrollmentId);

    // Update student with both changes
    updateStudent(studentId, {
      courseHistory: updatedCourseHistory,
      programEnrollments: updatedEnrollments,
    });

    // Remove student from the class
    updateClass(classId, {
      students: classData.students.filter((id) => id !== studentId),
    });

    // Show success message
    setSuccessMessage(`✓ Marked ${classData.name} as completed and added to course history`);
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  const handleAssignStudent = (studentId: string, programId: string, classId: string) => {
    // Check if student is already assigned to this class
    const assignedClasses = getAssignedClassIds();
    if (assignedClasses.includes(classId)) {
      alert('This student is already assigned to this class.');
      return;
    }

    // Check if payment is confirmed for this program
    const programEnrollment = (student.programEnrollments || []).find((e) => e.programId === programId);
    if (!programEnrollment || programEnrollment.paymentStatus !== 'confirmed') {
      alert('Cannot assign student to this program. Payment must be confirmed first. Please update the payment status in the Payment Status section.');
      return;
    }

    // Update existing enrollment or create new one
    let foundExistingEnrollment = false;
    const updatedEnrollments = (student.programEnrollments || []).map((e) => {
      if (e.programId === programId && !e.classId) {
        foundExistingEnrollment = true;
        return { ...e, classId, status: 'assigned' as const };
      }
      return e;
    });

    // If no existing enrollment without classId was found, create a new one
    if (!foundExistingEnrollment) {
      const newEnrollment: ProgramEnrollment = {
        id: generateId(),
        programId,
        batchNumber: 1,
        classId,
        enrollmentDate: new Date().toISOString(),
        status: 'assigned',
        paymentStatus: 'confirmed',
      };
      updatedEnrollments.push(newEnrollment);
    }

    updateStudent(studentId, { programEnrollments: updatedEnrollments });

    // Add student to class
    const classData = classes.find((c) => c.id === classId);
    if (classData) {
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
            <p className="text-sm text-gray-900 break-words">{student.email}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-600 font-semibold">Phone</p>
            <p className="text-sm text-gray-900 break-words">{student.phone}</p>
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
      {(student.programEnrollments || []).length > 0 && (
        <PaymentStatusSection
          enrollments={student.programEnrollments || []}
          programs={programs}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
        />
      )}

      {/* Program Enrollments Section */}
      <ProgramEnrollmentsSection
        enrollments={student.programEnrollments || []}
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
        title="Assign Student to Class"
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
          studentProgramEnrollments={student.programEnrollments || []}
          onAssign={handleAssignStudent}
          onCancel={() => setIsAssignmentModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
