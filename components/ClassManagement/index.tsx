'use client';

import { useState } from 'react';
import { useClasses, useStudents, useTeachers, usePrograms } from '@/lib/hooks';
import { Class } from '@/types';
import { Card, Modal, Button } from '@/components/ui';
import { ClassForm } from './ClassForm';
import { ClassCard } from './ClassCard';
import { ClassNameMigration } from './ClassNameMigration';
import { ClassStudentsModal } from './ClassStudentsModal';
import { canAssignStudentToClass } from '@/lib/assignment';

export function ClassManagement() {
  const { classes, isLoaded, addClass, updateClass, deleteClass } = useClasses();
  const { students, updateStudent } = useStudents();
  const { teachers } = useTeachers();
  const { programs } = usePrograms();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<Class | undefined>();
  const [editingClass, setEditingClass] = useState<Class | undefined>();
  const [filter, setFilter] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [archiveConfirmationClass, setArchiveConfirmationClass] = useState<Class | undefined>();
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  const filteredClasses = classes.filter((cls) => {
    const matchesFilter =
      cls.name.toLowerCase().includes(filter.toLowerCase()) ||
      cls.programLevel.toLowerCase().includes(filter.toLowerCase());
    const matchesArchiveStatus = showArchived ? cls.isArchived : !cls.isArchived;
    return matchesFilter && matchesArchiveStatus;
  });

  const handleSubmit = (classData: Omit<Class, 'id' | 'createdAt'>) => {
    if (editingClass) {
      updateClass(editingClass.id, classData);
      setEditingClass(undefined);
    } else {
      addClass(classData);
    }
    setIsModalOpen(false);
  };

  const handleEdit = (classData: Class) => {
    setEditingClass(classData);
    setIsModalOpen(true);
  };

  const handleViewStudents = (classData: Class) => {
    setSelectedClassForStudents(classData);
    setIsStudentsModalOpen(true);
  };

  const handleCloseStudentsModal = () => {
    setIsStudentsModalOpen(false);
    setSelectedClassForStudents(undefined);
  };

  const handleArchiveClass = (id: string) => {
    const classToArchive = classes.find((c) => c.id === id);
    if (classToArchive) {
      setArchiveConfirmationClass(classToArchive);
      setIsArchiveConfirmOpen(true);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveConfirmationClass) return;

    try {
      // Get all students enrolled in this class
      const enrolledStudents = students.filter((student) =>
        student.programEnrollments && student.programEnrollments.some((enrollment) => enrollment.classId === archiveConfirmationClass.id)
      );

      console.log(`[handleConfirmArchive] Archiving class ${archiveConfirmationClass.name} with ${enrolledStudents.length} students`);

      // For each student, mark the course as completed in their course history
      for (const student of enrolledStudents) {
        if (!student.programEnrollments) continue;

        // Find the enrollment for this class
        const enrollment = student.programEnrollments.find((e) => e.classId === archiveConfirmationClass.id);
        if (!enrollment) continue;

        console.log(`[handleConfirmArchive] Processing student ${student.id} with enrollment:`, enrollment);

        // Find program data for this enrollment
        const program = programs.find((p) => p.id === enrollment.programId);

        // Update course history: mark as COMPLETED if IN_PROGRESS, or create entry if doesn't exist
        let updatedCourseHistory = (student.courseHistory || []).slice(); // Clone the array

        // Check if this course already exists in history
        const existingCourseHistoryIndex = updatedCourseHistory.findIndex(
          (history) => history.courseId === archiveConfirmationClass.courseId
        );

        if (existingCourseHistoryIndex >= 0) {
          // Update existing entry only if it's IN_PROGRESS (don't overwrite COMPLETED entries)
          const existingHistory = updatedCourseHistory[existingCourseHistoryIndex];
          if (existingHistory.completionStatus === 'IN_PROGRESS') {
            console.log(`[handleConfirmArchive] Marking existing course history as COMPLETED for student ${student.id}`);
            updatedCourseHistory[existingCourseHistoryIndex] = {
              ...existingHistory,
              completionStatus: 'COMPLETED' as const,
              endDate: new Date().toISOString(),
            };
          } else {
            console.log(`[handleConfirmArchive] Course history already ${existingHistory.completionStatus}, skipping update`);
          }
        } else {
          // Create new course history entry as COMPLETED
          console.log(`[handleConfirmArchive] Creating new course history entry as COMPLETED for student ${student.id}`);
          const newCourseHistory = {
            id: Math.random().toString(36).substr(2, 9),
            courseId: archiveConfirmationClass.courseId,
            courseName: archiveConfirmationClass.name,
            programId: program?.id || '',
            programName: program?.name || '',
            batch: enrollment.batchNumber || 1,
            year: program?.year,
            completionStatus: 'COMPLETED' as const,
            startDate: enrollment.enrollmentDate || new Date().toISOString(),
            endDate: new Date().toISOString(),
            dateAdded: new Date().toISOString(),
          };
          updatedCourseHistory.push(newCourseHistory);
        }

        // Remove the enrollment from the class and mark as COMPLETED
        const updatedEnrollments = student.programEnrollments.map((e) =>
          e.classId === archiveConfirmationClass.id
            ? { ...e, classId: undefined, status: 'COMPLETED' as const }
            : e
        );

        await updateStudent(student.id, {
          programEnrollments: updatedEnrollments,
          courseHistory: updatedCourseHistory,
        });
      }

      // Now archive the class
      updateClass(archiveConfirmationClass.id, { isArchived: true });

      // Close modal
      setIsArchiveConfirmOpen(false);
      setArchiveConfirmationClass(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive class';
      console.error('Error archiving class:', error);
      alert(`Error archiving class: ${errorMessage}`);
    }
  };

  const handleCancelArchive = () => {
    setIsArchiveConfirmOpen(false);
    setArchiveConfirmationClass(undefined);
  };

  const handleUnarchiveClass = (id: string) => {
    const classToUnarchive = classes.find((c) => c.id === id);
    if (classToUnarchive) {
      updateClass(id, { isArchived: false });
    }
  };

  const handleDelete = async (id: string) => {
    const classToDelete = classes.find((c) => c.id === id);
    if (!classToDelete) return;

    const confirmMessage = `Are you sure you want to delete this class? ${
      classToDelete.students.length > 0
        ? `${classToDelete.students.length} student(s) assigned to this class will be moved back to unassigned status.`
        : ''
    }`;

    if (window.confirm(confirmMessage)) {
      try {
        // Reassign students from deleted class back to unassigned status
        for (const studentId of classToDelete.students) {
          const student = students.find((s) => s.id === studentId);
          if (student && student.programEnrollments) {
            const updatedEnrollments = student.programEnrollments.map((enrollment) =>
              enrollment.classId === id ? { ...enrollment, classId: undefined } : enrollment
            );
            await updateStudent(studentId, { programEnrollments: updatedEnrollments });
          }
        }

        // Delete the class
        await deleteClass(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete class';
        console.error('Error deleting class:', error);
        alert(`Error deleting class: ${errorMessage}`);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClass(undefined);
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <ClassNameMigration />

      <div className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search classes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800"
          >
            + Create Class
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700">Show Archived Classes</span>
          </label>
        </div>
      </div>

      {filteredClasses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No classes yet. Create one to get started!</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((classData) => {
            // Get students enrolled in this class
            const enrolledStudents = students.filter((student) =>
              student.programEnrollments && student.programEnrollments.some((enrollment) => enrollment.classId === classData.id)
            );
            const studentCount = enrolledStudents.length;

            // Validate and fix over-capacity issues
            if (studentCount > classData.capacity) {
              // Remove excess students from class
              const excessStudents = enrolledStudents.slice(classData.capacity);
              excessStudents.forEach((student) => {
                const updatedEnrollments = (student.programEnrollments || []).map((e) =>
                  e.classId === classData.id ? { ...e, classId: undefined } : e
                );
                updateStudent(student.id, { programEnrollments: updatedEnrollments });
              });
            }

            const teacher = classData.teacherId ? teachers.find((t) => t.id === classData.teacherId) : undefined;

            return (
              <ClassCard
                key={classData.id}
                classData={classData}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onArchive={handleArchiveClass}
                onUnarchive={handleUnarchiveClass}
                onViewStudents={handleViewStudents}
                studentCount={Math.min(studentCount, classData.capacity)}
                teacher={teacher}
              />
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingClass ? 'Edit Class' : 'Create New Class'}>
        <ClassForm onSubmit={handleSubmit} onCancel={handleCloseModal} initialData={editingClass} />
      </Modal>

      <Modal
        isOpen={isStudentsModalOpen}
        onClose={handleCloseStudentsModal}
        title={selectedClassForStudents ? `Students in ${selectedClassForStudents.name}` : 'Class Students'}
        size="lg"
      >
        {selectedClassForStudents && (
          <ClassStudentsModal
            classData={selectedClassForStudents}
            students={students}
            programs={programs}
          />
        )}
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={isArchiveConfirmOpen}
        onClose={handleCancelArchive}
        title="Archive Class Confirmation"
      >
        {archiveConfirmationClass && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900">Archive Class</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    You are about to archive <span className="font-semibold">{archiveConfirmationClass.name}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-blue-900 mb-2">What will happen:</h5>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span>All {students.filter((s) => s.programEnrollments?.some((e) => e.classId === archiveConfirmationClass.id)).length} student(s) currently in this class will be unassigned</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span>The course will be marked as <span className="font-semibold">COMPLETED</span> in their course history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span>Their enrollment status will be marked as <span className="font-semibold">COMPLETED</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">4.</span>
                  <span>The class will be hidden from the class assignment menu</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">5.</span>
                  <span>You can unarchive this class later if needed</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancelArchive}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmArchive}
                className="flex-1"
              >
                Archive Class
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
