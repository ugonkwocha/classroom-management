'use client';

import { useState, useEffect } from 'react';
import { Program } from '@/types';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'academy_programs';

// Default programs for Transcend AI Academy
const DEFAULT_PROGRAMS: Omit<Program, 'id'>[] = [
  {
    name: 'January Weekend Code Club',
    type: 'WeekendClub',
    season: 'January',
    year: 2025,
    batches: 1,
    slots: ['Saturday 10am-12pm'],
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Easter Holiday Code Camp',
    type: 'HolidayCamp',
    season: 'Easter',
    year: 2025,
    batches: 2,
    slots: ['Morning 9am-11am', 'Afternoon 1pm-3pm'],
    createdAt: new Date().toISOString(),
  },
  {
    name: 'May Weekend Code Class',
    type: 'WeekendClub',
    season: 'May',
    year: 2025,
    batches: 1,
    slots: ['Saturday 10am-12pm'],
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Summer Holiday Code Camp',
    type: 'HolidayCamp',
    season: 'Summer',
    year: 2025,
    batches: 3,
    slots: ['Morning 9am-11am', 'Afternoon 1pm-3pm'],
    createdAt: new Date().toISOString(),
  },
  {
    name: 'October Weekend Code Club',
    type: 'WeekendClub',
    season: 'October',
    year: 2025,
    batches: 1,
    slots: ['Saturday 10am-12pm'],
    createdAt: new Date().toISOString(),
  },
];

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPrograms(JSON.parse(stored));
      } else {
        // Initialize with default programs
        const defaultProgramsWithIds = DEFAULT_PROGRAMS.map((prog) => ({
          ...prog,
          id: generateId(),
        }));
        setPrograms(defaultProgramsWithIds);
      }
    } catch (error) {
      console.error('Failed to load programs:', error);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded && programs.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
      } catch (error) {
        console.error('Failed to save programs:', error);
      }
    }
  }, [programs, isLoaded]);

  const addProgram = (program: Omit<Program, 'id' | 'createdAt'>) => {
    const newProgram: Program = {
      ...program,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setPrograms((prev) => [...prev, newProgram]);
    return newProgram;
  };

  const updateProgram = (id: string, updates: Partial<Program>) => {
    setPrograms((prev) =>
      prev.map((program) =>
        program.id === id ? { ...program, ...updates } : program
      )
    );
  };

  const deleteProgram = (id: string) => {
    setPrograms((prev) => prev.filter((program) => program.id !== id));
  };

  const getProgram = (id: string) => {
    return programs.find((program) => program.id === id);
  };

  return {
    programs,
    isLoaded,
    addProgram,
    updateProgram,
    deleteProgram,
    getProgram,
  };
}
