'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { Student, CourseHistory, ProgramEnrollment } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useStudents() {
  const { data: students = [], isLoading, error, mutate } = useSWR<Student[]>(
    '/api/students',
    fetcher,
    { revalidateOnFocus: false } as SWRConfiguration
  );

  const isLoaded = !isLoading && !error;

  const addStudent = async (student: Omit<Student, 'id' | 'createdAt'>) => {
    try {
      // Separate programEnrollments and courseHistory from student data
      const { programEnrollments, courseHistory, ...studentData } = student;

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      const newStudent = await res.json();

      // Create program enrollments separately if provided
      if (programEnrollments && programEnrollments.length > 0) {
        for (const enrollment of programEnrollments) {
          try {
            await fetch('/api/enrollments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: newStudent.id,
                programId: enrollment.programId,
                classId: enrollment.classId,
                batchNumber: enrollment.batchNumber,
                status: enrollment.status,
                paymentStatus: enrollment.paymentStatus,
              }),
            });
          } catch (enrollmentError) {
            console.error('Failed to create enrollment:', enrollmentError);
            // Continue with other enrollments even if one fails
          }
        }
      }

      await mutate();
      return newStudent;
    } catch (error) {
      console.error('Failed to add student:', error);
      throw error;
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    try {
      // Separate programEnrollments and courseHistory from student data
      const { programEnrollments, courseHistory, ...studentData } = updates;

      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      const updatedStudent = await res.json();

      // Handle program enrollments if they're being updated
      if (programEnrollments) {
        const existingEnrollments = students.find((s) => s.id === id)?.programEnrollments || [];

        // Add new enrollments that don't have IDs
        const newEnrollments = programEnrollments.filter((e) => !e.id || e.id.length === 0);
        for (const enrollment of newEnrollments) {
          try {
            await fetch('/api/enrollments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: id,
                programId: enrollment.programId,
                classId: enrollment.classId,
                batchNumber: enrollment.batchNumber,
                status: enrollment.status,
                paymentStatus: enrollment.paymentStatus,
              }),
            });
          } catch (enrollmentError) {
            console.error('Failed to create enrollment:', enrollmentError);
          }
        }
      }

      await mutate();
      return updatedStudent;
    } catch (error) {
      console.error('Failed to update student:', error);
      throw error;
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      await fetch(`/api/students/${id}`, { method: 'DELETE' });
      await mutate();
    } catch (error) {
      console.error('Failed to delete student:', error);
      throw error;
    }
  };

  const getStudent = (id: string) => {
    return students.find((student) => student.id === id);
  };

  // Course History Management
  const addCourseHistory = async (studentId: string, courseHistory: Omit<CourseHistory, 'id'>) => {
    try {
      const student = getStudent(studentId);
      if (!student) throw new Error('Student not found');

      const res = await fetch('/api/course-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseHistory),
      });
      const newHistory = await res.json();
      await mutate();
      return newHistory;
    } catch (error) {
      console.error('Failed to add course history:', error);
      throw error;
    }
  };

  const removeCourseHistory = async (studentId: string, historyId: string) => {
    try {
      await fetch(`/api/course-history/${historyId}`, { method: 'DELETE' });
      await mutate();
    } catch (error) {
      console.error('Failed to remove course history:', error);
      throw error;
    }
  };

  const updateCourseHistory = async (
    studentId: string,
    historyId: string,
    updates: Partial<CourseHistory>
  ) => {
    try {
      const res = await fetch(`/api/course-history/${historyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updatedHistory = await res.json();
      await mutate();
      return updatedHistory;
    } catch (error) {
      console.error('Failed to update course history:', error);
      throw error;
    }
  };

  // Program Enrollment Management
  const addProgramEnrollment = async (
    studentId: string,
    enrollment: Omit<ProgramEnrollment, 'id'>
  ) => {
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...enrollment, studentId }),
      });
      const newEnrollment = await res.json();
      await mutate();
      return newEnrollment;
    } catch (error) {
      console.error('Failed to add program enrollment:', error);
      throw error;
    }
  };

  const removeProgramEnrollment = async (studentId: string, enrollmentId: string) => {
    try {
      await fetch(`/api/enrollments/${enrollmentId}`, { method: 'DELETE' });
      await mutate();
    } catch (error) {
      console.error('Failed to remove program enrollment:', error);
      throw error;
    }
  };

  const updateProgramEnrollment = async (
    studentId: string,
    enrollmentId: string,
    updates: Partial<ProgramEnrollment>
  ) => {
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updatedEnrollment = await res.json();
      await mutate();
      return updatedEnrollment;
    } catch (error) {
      console.error('Failed to update program enrollment:', error);
      throw error;
    }
  };

  // Get student's enrollments for a specific program
  const getStudentEnrollmentsForProgram = (studentId: string, programId: string) => {
    const student = getStudent(studentId);
    if (!student) return [];
    return (student.programEnrollments || []).filter((e) => e.programId === programId);
  };

  // Get all students in waitlist for a specific program/batch
  const getWaitlistedStudents = (programId: string, batchNumber: number) => {
    return students.filter((student) =>
      student.programEnrollments && student.programEnrollments.some(
        (e) => e.programId === programId && e.batchNumber === batchNumber && e.status === 'waitlist'
      )
    );
  };

  return {
    students,
    isLoaded,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudent,
    addCourseHistory,
    removeCourseHistory,
    updateCourseHistory,
    addProgramEnrollment,
    removeProgramEnrollment,
    updateProgramEnrollment,
    getStudentEnrollmentsForProgram,
    getWaitlistedStudents,
  };
}
