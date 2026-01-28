'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { Course } from '@/types';
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

export function useCourses() {
  const { data: courses = [], isLoading, error, mutate } = useSWR<Course[]>(
    '/api/courses',
    fetcher,
    { revalidateOnFocus: false } as SWRConfiguration
  );

  const isLoaded = !isLoading && !error;

  const addCourse = async (course: Omit<Course, 'id' | 'createdAt'>) => {
    try {
      const res = await fetchWithAuth('/api/courses', {
        method: 'POST',
        body: JSON.stringify(course),
      });
      const newCourse = await res.json();
      await mutate();
      return newCourse;
    } catch (error) {
      console.error('Failed to add course:', error);
      throw error;
    }
  };

  const updateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      const res = await fetchWithAuth(`/api/courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const updatedCourse = await res.json();
      await mutate();
      return updatedCourse;
    } catch (error) {
      console.error('Failed to update course:', error);
      throw error;
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await fetchWithAuth(`/api/courses/${id}`, { method: 'DELETE' });
      await mutate();
    } catch (error) {
      console.error('Failed to delete course:', error);
      throw error;
    }
  };

  const getCourse = (id: string) => {
    return courses.find((course) => course.id === id);
  };

  return {
    courses,
    isLoaded,
    addCourse,
    updateCourse,
    deleteCourse,
    getCourse,
  };
}
