'use client';

import { useState, useEffect } from 'react';
import { Class } from '@/types';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'academy_classes';

export function useClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setClasses(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
      } catch (error) {
        console.error('Failed to save classes:', error);
      }
    }
  }, [classes, isLoaded]);

  const addClass = (classData: Omit<Class, 'id' | 'createdAt'>) => {
    const newClass: Class = {
      ...classData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setClasses((prev) => [...prev, newClass]);
    return newClass;
  };

  const updateClass = (id: string, updates: Partial<Class>) => {
    setClasses((prev) =>
      prev.map((classItem) =>
        classItem.id === id ? { ...classItem, ...updates } : classItem
      )
    );
  };

  const deleteClass = (id: string) => {
    setClasses((prev) => prev.filter((classItem) => classItem.id !== id));
  };

  const getClass = (id: string) => {
    return classes.find((classItem) => classItem.id === id);
  };

  const addStudentToClass = (classId: string, studentId: string) => {
    updateClass(classId, {
      students: [...(getClass(classId)?.students || []), studentId],
    });
  };

  const removeStudentFromClass = (classId: string, studentId: string) => {
    const classItem = getClass(classId);
    if (classItem) {
      updateClass(classId, {
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
