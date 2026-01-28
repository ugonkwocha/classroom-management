'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { Teacher, TeacherStatus } from '@/types';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

const fetcher = (url: string) =>
  fetchWithAuth(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      // Ensure data is always an array
      return Array.isArray(data) ? data : [];
    });

export function useTeachers() {
  const { data: teachers = [], isLoading, error, mutate } = useSWR<Teacher[]>(
    '/api/teachers',
    fetcher,
    { revalidateOnFocus: false } as SWRConfiguration
  );

  const isLoaded = !isLoading && !error;

  const addTeacher = async (teacher: Omit<Teacher, 'id' | 'createdAt'>) => {
    try {
      const res = await fetchWithAuth('/api/teachers', {
        method: 'POST',
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
      const res = await fetchWithAuth(`/api/teachers/${id}`, {
        method: 'PUT',
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
      await fetchWithAuth(`/api/teachers/${id}`, { method: 'DELETE' });
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
    error,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacher,
    getTeachersByStatus,
    getTeachersByCourse,
  };
}
