'use client';

import { useState, useEffect } from 'react';
import { useStudents } from '@/lib/hooks';
import { Student } from '@/types';
import { Card, Modal } from '@/components/ui';
import { StudentForm } from './StudentForm';
import { StudentList } from './StudentList';

export function StudentManagement() {
  const { students, isLoaded, addStudent, updateStudent, deleteStudent } = useStudents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [filter, setFilter] = useState<string>('');

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(filter.toLowerCase()) ||
    student.programLevel.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSubmit = (studentData: Omit<Student, 'id'>) => {
    if (editingStudent) {
      updateStudent(editingStudent.id, studentData);
      setEditingStudent(undefined);
    } else {
      addStudent(studentData);
    }
    setIsModalOpen(false);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      deleteStudent(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStudent(undefined);
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search students..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800"
        >
          + Add Student
        </button>
      </div>

      <Card>
        <StudentList
          students={filteredStudents}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStudent ? 'Edit Student' : 'Add New Student'}>
        <StudentForm onSubmit={handleSubmit} initialData={editingStudent} />
      </Modal>
    </div>
  );
}
