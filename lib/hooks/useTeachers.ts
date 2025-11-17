'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { Teacher, TeacherStatus } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTeachers() {
  const { data: teachers = [], isLoading, error, mutate } = useSWR<Teacher[]>(
    '/api/teachers',
    fetcher,
    { revalidateOnFocus: false } as SWRConfiguration
  );

  const isLoaded = !isLoading && !error;

  const addTeacher = async (teacher: Omit<Teacher, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacher),
      });
      const newTeacher = await res.json();
      await mutate();
      return newTeacher;
    } catch (error) {
      console.error('Failed to add teacher:', error);
      throw error;
    }
  };

  const updateTeacher = async (id: string, updates: Partial<Omit<Teacher, 'id' | 'createdAt'>>) => {
    try {
      const res = await fetch(`/api/teachers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updatedTeacher = await res.json();
      await mutate();
      return updatedTeacher;
    } catch (error) {
      console.error('Failed to update teacher:', error);
      throw error;
    }
  };

  const deleteTeacher = async (id: string) => {
    try {
      await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
      await mutate();
    } catch (error) {
      console.error('Failed to delete teacher:', error);
      throw error;
    }
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
