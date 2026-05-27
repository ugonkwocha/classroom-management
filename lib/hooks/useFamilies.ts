'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { Family } from '@/types';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type GuardianPayload = {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  relationship?: string;
  isPrimary?: boolean;
  isActive?: boolean;
  needsReview?: boolean;
};

type FamilyPayload = {
  displayName?: string;
  guardians: GuardianPayload[];
  studentIds?: string[];
};

const fetcher = (url: string) =>
  fetchWithAuth(url).then(async (res) => {
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    return res.json();
  });

export function useFamilies(search = '') {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  const { data: families = [], isLoading, error, mutate } = useSWR<Family[]>(
    `/api/families${query}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      focusThrottleInterval: 0,
      keepPreviousData: true,
    } as SWRConfiguration
  );

  const createFamily = async (payload: FamilyPayload) => {
    const res = await fetchWithAuth('/api/families', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to create family');
    }
    const family = await res.json();
    await mutate();
    return family;
  };

  const updateFamily = async (id: string, payload: Partial<Omit<FamilyPayload, 'guardians'>> & { guardians?: GuardianPayload[]; isArchived?: boolean }) => {
    const res = await fetchWithAuth(`/api/families/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to update family');
    }
    const family = await res.json();
    await mutate();
    return family;
  };

  const deleteFamily = async (id: string) => {
    const res = await fetchWithAuth(`/api/families/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to delete family');
    }
    const result = await res.json();
    await mutate();
    return result;
  };

  const deleteEmptyFamilies = async () => {
    const res = await fetchWithAuth('/api/families', { method: 'DELETE' });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to delete empty families');
    }
    const result = await res.json();
    await mutate();
    return result;
  };

  const mergeFamily = async (destinationFamilyId: string, sourceFamilyId: string) => {
    const res = await fetchWithAuth(`/api/families/${destinationFamilyId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ sourceFamilyId }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to merge families');
    }
    const family = await res.json();
    await mutate();
    return family;
  };

  const moveStudentToFamily = async (studentId: string, familyId: string) => {
    const res = await fetchWithAuth(`/api/students/${studentId}/family`, {
      method: 'PUT',
      body: JSON.stringify({ familyId }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to move student');
    }
    const student = await res.json();
    await mutate();
    return student;
  };

  return {
    families,
    isLoaded: !isLoading && !error,
    isLoading,
    error,
    mutate,
    createFamily,
    updateFamily,
    deleteFamily,
    deleteEmptyFamilies,
    mergeFamily,
    moveStudentToFamily,
  };
}
