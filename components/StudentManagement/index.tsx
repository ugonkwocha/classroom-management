'use client';

import { useState, useEffect } from 'react';
import { useStudents } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Student } from '@/types';
import { Card, Modal } from '@/components/ui';
import { PERMISSIONS } from '@/lib/permissions';
import { StudentForm } from './StudentForm';
import { StudentList } from './StudentList';
import { StudentDetailsView } from './StudentDetailsView';

interface StudentManagementProps {
  selectedStudentId?: string;
}

export function StudentManagement({ selectedStudentId }: StudentManagementProps) {
  const { students, isLoaded, addStudent, updateStudent, deleteStudent } = useStudents();
  const { hasPermission } = useAuth();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [viewingStudent, setViewingStudent] = useState<Student | undefined>();
  const [filter, setFilter] = useState<string>('');
  const [formApiErrors, setFormApiErrors] = useState<string[]>([]);

  const canCreate = hasPermission(PERMISSIONS.CREATE_STUDENT);
  const canEdit = hasPermission(PERMISSIONS.UPDATE_STUDENT);
  const canDelete = hasPermission(PERMISSIONS.DELETE_STUDENT);

  // Handle student ID from parent component (e.g., from dashboard modal)
  useEffect(() => {
    if (selectedStudentId && isLoaded && students.length > 0) {
      const student = students.find((s) => s.id === selectedStudentId);
      if (student) {
        setViewingStudent(student);
        setIsDetailsModalOpen(true);
      }
    }
  }, [selectedStudentId, isLoaded, students]);

  const filteredStudents = students.filter((student) =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
    (student.email?.toLowerCase() || '').includes(filter.toLowerCase())
  );

  const handleSubmit = async (studentData: Omit<Student, 'id' | 'createdAt'>) => {
    try {
      setFormApiErrors([]);
      console.log('StudentManagement handleSubmit received studentData:', studentData);
      if (editingStudent) {
        console.log('[StudentManagement] EDITING student:', editingStudent.id);
        console.log('[StudentManagement] Sending programEnrollments:', studentData.programEnrollments?.length || 0);
        await updateStudent(editingStudent.id, studentData);
        setEditingStudent(undefined);
        // Refresh the viewing student with updated data if details modal is open
        if (isDetailsModalOpen && viewingStudent?.id === editingStudent.id) {
          const updatedStudent = students.find((s) => s.id === editingStudent.id);
          if (updatedStudent) {
            setViewingStudent(updatedStudent);
          }
        }
      } else {
        console.log('[StudentManagement] CREATING new student');
        console.log('Calling addStudent with programEnrollments:', studentData.programEnrollments);
        await addStudent(studentData);
      }
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving student:', error);

      // Check if it's a validation error with details array
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.details && Array.isArray(errorData.details)) {
            setFormApiErrors(errorData.details);
            return;
          }
        } catch (parseError) {
          // Not JSON, continue with message
        }

        const errorMessage = error.message;
        if (errorMessage.includes('already in use')) {
          setFormApiErrors([errorMessage]);
          return;
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to save student';
      alert(errorMessage);
    }
  };

  const handleView = (student: Student) => {
    setViewingStudent(student);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsFormModalOpen(true);
  };

  const handleEditFromDetails = () => {
    if (viewingStudent) {
      setIsDetailsModalOpen(false);
      setEditingStudent(viewingStudent);
      setIsFormModalOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteStudent(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete student';
        console.error('Error deleting student:', error);
        alert(`Error deleting student: ${errorMessage}`);
      }
    }
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingStudent(undefined);
    setFormApiErrors([]);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setViewingStudent(undefined);
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {canCreate && (
          <button
            onClick={() => {
              setEditingStudent(undefined);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800"
          >
            + Add Student
          </button>
        )}
      </div>

      <Card>
        <StudentList
          students={filteredStudents}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </Card>

      {/* Form Modal for Create/Edit */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
        size="lg"
      >
        <StudentForm
          onSubmit={handleSubmit}
          onCancel={handleCloseFormModal}
          initialData={editingStudent}
          apiErrors={formApiErrors}
        />
      </Modal>

      {/* Details Modal for Viewing */}
      <Modal isOpen={isDetailsModalOpen} onClose={handleCloseDetailsModal} title="Student Details" size="xl">
        {viewingStudent && (
          <StudentDetailsView
            student={viewingStudent}
            onClose={handleCloseDetailsModal}
            onEdit={handleEditFromDetails}
          />
        )}
      </Modal>
    </div>
  );
}
