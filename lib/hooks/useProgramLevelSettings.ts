'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { ProgramLevel, ProgramLevelSetting } from '@/types';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { mergeProgramLevelSettings } from '@/lib/program-levels';

const fetcher = (url: string) =>
  fetchWithAuth(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => mergeProgramLevelSettings(Array.isArray(data) ? data : []));

export function useProgramLevelSettings() {
  const { data, isLoading, error, mutate } = useSWR<ProgramLevelSetting[]>(
    '/api/program-levels',
    fetcher,
    { revalidateOnFocus: false } as SWRConfiguration
  );

  const settings = mergeProgramLevelSettings(data || []);

  const updateProgramLevelSetting = async (
    level: ProgramLevel,
    updates: Pick<ProgramLevelSetting, 'displayName'> & Partial<Pick<ProgramLevelSetting, 'ageRange' | 'description'>>
  ) => {
    const res = await fetchWithAuth('/api/program-levels', {
      method: 'PUT',
      body: JSON.stringify({ level, ...updates }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'Failed to update program level');
    }

    const updated = await res.json();
    await mutate();
    return updated;
  };

  return {
    settings,
    isLoaded: !isLoading && !error,
    error,
    updateProgramLevelSetting,
  };
}
