'use client';

import { useState, useEffect } from 'react';
import { Student, CourseHistory, ProgramEnrollment } from '@/types';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'academy_students';

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setStudents(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load students:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever students change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
      } catch (error) {
        console.error('Failed to save students:', error);
      }
    }
  }, [students, isLoaded]);

  const addStudent = (student: Omit<Student, 'id' | 'createdAt'>) => {
    const newStudent: Student = {
      ...student,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setStudents((prev) => [...prev, newStudent]);
    return newStudent;
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, ...updates } : student
      )
    );
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  const getStudent = (id: string) => {
    return students.find((student) => student.id === id);
  };

  // Course History Management
  const addCourseHistory = (studentId: string, courseHistory: Omit<CourseHistory, 'id'>) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              courseHistory: [
                ...student.courseHistory,
                { ...courseHistory, id: generateId() },
              ],
            }
          : student
      )
    );
  };

  const removeCourseHistory = (studentId: string, historyId: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              courseHistory: student.courseHistory.filter((h) => h.id !== historyId),
            }
          : student
      )
    );
  };

  const updateCourseHistory = (
    studentId: string,
    historyId: string,
    updates: Partial<CourseHistory>
  ) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              courseHistory: student.courseHistory.map((h) =>
                h.id === historyId ? { ...h, ...updates } : h
              ),
            }
          : student
      )
    );
  };

  // Program Enrollment Management
  const addProgramEnrollment = (
    studentId: string,
    enrollment: Omit<ProgramEnrollment, 'id'>
  ) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              programEnrollments: [
                ...(student.programEnrollments || []),
                { ...enrollment, id: generateId() },
              ],
            }
          : student
      )
    );
  };

  const removeProgramEnrollment = (studentId: string, enrollmentId: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              programEnrollments: (student.programEnrollments || []).filter((e) => e.id !== enrollmentId),
            }
          : student
      )
    );
  };

  const updateProgramEnrollment = (
    studentId: string,
    enrollmentId: string,
    updates: Partial<ProgramEnrollment>
  ) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              programEnrollments: (student.programEnrollments || []).map((e) =>
                e.id === enrollmentId ? { ...e, ...updates } : e
              ),
            }
          : student
      )
    );
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
