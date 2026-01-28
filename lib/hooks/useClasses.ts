'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { Class } from '@/types';
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

export function useClasses() {
  const { data: classes = [], isLoading, error, mutate } = useSWR<Class[]>(
    '/api/classes',
    fetcher,
    { revalidateOnFocus: false } as SWRConfiguration
  );

  const isLoaded = !isLoading && !error;

  const addClass = async (classData: Omit<Class, 'id' | 'createdAt'>) => {
    try {
      const res = await fetchWithAuth('/api/classes', {
        method: 'POST',
        body: JSON.stringify(classData),
      });
      const newClass = await res.json();
      await mutate();
      return newClass;
    } catch (error) {
      console.error('Failed to add class:', error);
      throw error;
    }
  };

  const updateClass = async (id: string, updates: Partial<Class>) => {
    try {
      const res = await fetchWithAuth(`/api/classes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const updatedClass = await res.json();
      await mutate();
      return updatedClass;
    } catch (error) {
      console.error('Failed to update class:', error);
      throw error;
    }
  };

  const deleteClass = async (id: string) => {
    try {
      await fetchWithAuth(`/api/classes/${id}`, { method: 'DELETE' });
      await mutate();
    } catch (error) {
      console.error('Failed to delete class:', error);
      throw error;
    }
  };

  const getClass = (id: string) => {
    return classes.find((classItem) => classItem.id === id);
  };

  const addStudentToClass = async (classId: string, studentId: string) => {
    const classItem = getClass(classId);
    if (!classItem) throw new Error('Class not found');
    return updateClass(classId, {
      students: [...(classItem.students || []), studentId],
    });
  };

  const removeStudentFromClass = async (classId: string, studentId: string) => {
    const classItem = getClass(classId);
    if (classItem) {
      return updateClass(classId, {
        students: classItem.students.filter((id) => id !== studentId),
      });
    }
  };

  return {
    classes,
    isLoaded,
    addClass,
    updateClass,
    deleteClass,
    getClass,
    addStudentToClass,
    removeStudentFromClass,
  };
}
