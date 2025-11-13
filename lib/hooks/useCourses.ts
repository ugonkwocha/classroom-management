'use client';

import { useState, useEffect } from 'react';
import { Course } from '@/types';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'academy_courses';

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCourses(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
      } catch (error) {
        console.error('Failed to save courses:', error);
      }
    }
  }, [courses, isLoaded]);

  const addCourse = (course: Omit<Course, 'id' | 'createdAt'>) => {
    const newCourse: Course = {
      ...course,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setCourses((prev) => [...prev, newCourse]);
    return newCourse;
  };

  const updateCourse = (id: string, updates: Partial<Course>) => {
    setCourses((prev) =>
      prev.map((course) =>
        course.id === id ? { ...course, ...updates } : course
      )
    );
  };

  const deleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((course) => course.id !== id));
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
