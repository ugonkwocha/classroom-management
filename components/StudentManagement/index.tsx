'use client';

import { useState } from 'react';
import { useStudents } from '@/lib/hooks';
import { Student } from '@/types';
import { Card, Modal } from '@/components/ui';
import { StudentForm } from './StudentForm';
import { StudentList } from './StudentList';
import { StudentDetailsView } from './StudentDetailsView';

export function StudentManagement() {
  const { students, isLoaded, addStudent, updateStudent, deleteStudent } = useStudents();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [viewingStudent, setViewingStudent] = useState<Student | undefined>();
  const [filter, setFilter] = useState<string>('');

  const filteredStudents = students.filter((student) =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
    student.email.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSubmit = (studentData: Omit<Student, 'id' | 'createdAt'>) => {
    if (editingStudent) {
      updateStudent(editingStudent.id, studentData);
      setEditingStudent(undefined);
    } else {
      addStudent(studentData);
    }
    setIsFormModalOpen(false);
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

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      deleteStudent(id);
    }
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingStudent(undefined);
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
        <button
          onClick={() => {
            setEditingStudent(undefined);
            setIsFormModalOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800"
        >
          + Add Student
        </button>
      </div>

      <Card>
        <StudentList
          students={filteredStudents}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Card>

      {/* Form Modal for Create/Edit */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
      >
        <StudentForm
          onSubmit={handleSubmit}
          onCancel={handleCloseFormModal}
          initialData={editingStudent}
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
