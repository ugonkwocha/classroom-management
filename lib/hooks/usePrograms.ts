'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { Program } from '@/types';
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

export function usePrograms() {
  const { data: programs = [], isLoading, error, mutate } = useSWR<Program[]>(
    '/api/programs',
    fetcher,
    { revalidateOnFocus: false } as SWRConfiguration
  );

  const isLoaded = !isLoading && !error;

  const addProgram = async (program: Omit<Program, 'id' | 'createdAt'>) => {
    try {
      const res = await fetchWithAuth('/api/programs', {
        method: 'POST',
        body: JSON.stringify(program),
      });
      const newProgram = await res.json();
      if (!res.ok) {
        throw new Error(newProgram.error || 'Failed to create program');
      }
      await mutate();
      return newProgram;
    } catch (error) {
      console.error('Failed to add program:', error);
      throw error;
    }
  };

  const updateProgram = async (id: string, updates: Partial<Program>) => {
    try {
      const res = await fetchWithAuth(`/api/programs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const updatedProgram = await res.json();
      if (!res.ok) {
        throw new Error(updatedProgram.error || 'Failed to update program');
      }
      await mutate();
      return updatedProgram;
    } catch (error) {
      console.error('Failed to update program:', error);
      throw error;
    }
  };

  const deleteProgram = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/programs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete program');
      }
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
