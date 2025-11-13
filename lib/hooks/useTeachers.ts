'use client';

import { useState, useEffect } from 'react';
import { Teacher, TeacherStatus } from '@/types';

const STORAGE_KEY = 'academy_teachers';

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load teachers from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTeachers(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse teachers from localStorage:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save teachers to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teachers));
    }
  }, [teachers, isLoaded]);

  const addTeacher = (teacher: Omit<Teacher, 'id' | 'createdAt'>) => {
    const newTeacher: Teacher = {
      ...teacher,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setTeachers([...teachers, newTeacher]);
    return newTeacher;
  };

  const updateTeacher = (id: string, updates: Partial<Omit<Teacher, 'id' | 'createdAt'>>) => {
    setTeachers(
      teachers.map((teacher) =>
        teacher.id === id
          ? {
              ...teacher,
              ...updates,
            }
          : teacher
      )
    );
  };

  const deleteTeacher = (id: string) => {
    setTeachers(teachers.filter((teacher) => teacher.id !== id));
  };

  const getTeacher = (id: string) => {
    return teachers.find((teacher) => teacher.id === id);
  };

  const getTeachersByStatus = (status: TeacherStatus) => {
    return teachers.filter((teacher) => teacher.status === status);
  };

  const getTeachersByCourse = (courseId: string) => {
    return teachers.filter((teacher) => teacher.qualifiedCourses.includes(courseId));
  };

  return {
    teachers,
    isLoaded,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacher,
    getTeachersByStatus,
    getTeachersByCourse,
  };
}
