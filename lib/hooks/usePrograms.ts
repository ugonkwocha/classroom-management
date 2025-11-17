'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { Program } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePrograms() {
  const { data: programs = [], isLoading, error, mutate } = useSWR<Program[]>(
    '/api/programs',
    fetcher,
    { revalidateOnFocus: false } as SWRConfiguration
  );

  const isLoaded = !isLoading && !error;

  const addProgram = async (program: Omit<Program, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(program),
      });
      const newProgram = await res.json();
      await mutate();
      return newProgram;
    } catch (error) {
      console.error('Failed to add program:', error);
      throw error;
    }
  };

  const updateProgram = async (id: string, updates: Partial<Program>) => {
    try {
      const res = await fetch(`/api/programs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updatedProgram = await res.json();
      await mutate();
      return updatedProgram;
    } catch (error) {
      console.error('Failed to update program:', error);
      throw error;
    }
  };

  const deleteProgram = async (id: string) => {
    try {
      await fetch(`/api/programs/${id}`, { method: 'DELETE' });
      await mutate();
    } catch (error) {
      console.error('Failed to delete program:', error);
      throw error;
    }
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
