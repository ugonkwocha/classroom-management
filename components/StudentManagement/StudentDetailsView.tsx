'use client';

import { useState } from 'react';
import { Student, CourseHistory, ProgramEnrollment } from '@/types';
import { useClasses, usePrograms, useCourses, useStudents } from '@/lib/hooks';
import { Card, Button, Modal } from '@/components/ui';
import { CourseHistorySection } from './CourseHistorySection';
import { ProgramEnrollmentsSection } from './ProgramEnrollmentsSection';
import { AssignmentModal } from './AssignmentModal';
import { generateId } from '@/lib/utils';

interface StudentDetailsViewProps {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
}

export function StudentDetailsView({ student, onClose, onEdit }: StudentDetailsViewProps) {
  const { classes, updateClass } = useClasses();
  const { programs } = usePrograms();
  const { courses } = useCourses();
  const { updateStudent } = useStudents();
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

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
      .filter((e) => e.status === 'assigned')
      .map((e) => e.classId);
  };

  const handleAssignStudent = (studentId: string, programId: string, classId: string) => {
    // Check if student is already assigned to this class
    const assignedClasses = getAssignedClassIds();
    if (assignedClasses.includes(classId)) {
      alert('This student is already assigned to this class.');
      return;
    }

    // Create new enrollment
    const newEnrollment: ProgramEnrollment = {
      id: generateId(),
      programId,
      batchNumber: 1, // Default batch number
      classId,
      enrollmentDate: new Date().toISOString(),
      status: 'assigned',
    };

    // Add enrollment to student
    const updatedEnrollments = [...(student.programEnrollments || []), newEnrollment];
    updateStudent(studentId, { programEnrollments: updatedEnrollments });

    // Add student to class
    const classData = classes.find((c) => c.id === classId);
    if (classData) {
      updateClass(classId, {
        students: [...classData.students, studentId],
      });
    }
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
            <p className="text-xs text-gray-600 font-semibold">Payment Status</p>
            <p className={`text-sm font-semibold ${
              student.paymentStatus === 'completed' ? 'text-green-600' :
              student.paymentStatus === 'confirmed' ? 'text-blue-600' :
              'text-amber-600'
            }`}>
              {student.paymentStatus.charAt(0).toUpperCase() + student.paymentStatus.slice(1)}
            </p>
          </div>
          <div className="min-w-0">
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
        courseHistory={student.courseHistory || []}
        getCourseName={getCourseName}
      />

      {/* Program Enrollments Section */}
      <ProgramEnrollmentsSection
        enrollments={student.programEnrollments || []}
        classes={classes}
        programs={programs}
        getProgramName={getProgramName}
        getCourseName={getCourseName}
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
          assignedClassIds={getAssignedClassIds()}
          onAssign={handleAssignStudent}
          onCancel={() => setIsAssignmentModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
