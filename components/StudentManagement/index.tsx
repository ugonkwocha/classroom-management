'use client';

import { useState, useEffect } from 'react';
import { useStudents } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Student } from '@/types';
import { Modal } from '@/components/ui';
import { PERMISSIONS } from '@/lib/permissions';
import { StudentForm } from './StudentForm';
import { StudentList } from './StudentList';
import { StudentDetailsView } from './StudentDetailsView';
import { FiPlus, FiSearch, FiUserCheck, FiUserPlus, FiUsers } from 'react-icons/fi';

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
    (student.email?.toLowerCase() || '').includes(filter.toLowerCase()) ||
    (student.parentEmail?.toLowerCase() || '').includes(filter.toLowerCase())
  );

  const assignedStudents = students.filter((student) =>
    (student.programEnrollments || student.enrollments || []).some((enrollment) => enrollment.classId)
  ).length;
  const returningStudents = students.filter((student) => student.isReturningStudent).length;
  const pendingPayments = students.filter((student) => student.paymentStatus === 'PENDING').length;

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
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiUsers className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Total Students</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{students.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiUserCheck className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Assigned Students</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{assignedStudents}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600">
            <FiUserPlus className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Returning</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{returningStudents}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <FiUserCheck className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Pending Payment</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{pendingPayments}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Student Directory</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredStudents.length} students shown</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm sm:w-80">
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, parent..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(undefined);
                  setIsFormModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <FiPlus className="h-4 w-4" />
                Add Student
              </button>
            )}
          </div>
        </div>
        <div className="p-5">
        <StudentList
          students={filteredStudents}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
        </div>
      </section>

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
