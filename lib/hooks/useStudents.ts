'use client';

import { useState, useEffect } from 'react';
import { Student } from '@/types';
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

  const addStudent = (student: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...student,
      id: generateId(),
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

  return {
    students,
    isLoaded,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudent,
  };
}
