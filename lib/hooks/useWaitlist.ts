'use client';

import { useState, useEffect } from 'react';
import { WaitlistEntry } from '@/types';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'academy_waitlist';

export function useWaitlist() {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setWaitlist(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load waitlist:', error);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(waitlist));
      } catch (error) {
        console.error('Failed to save waitlist:', error);
      }
    }
  }, [waitlist, isLoaded]);

  const addToWaitlist = (entry: Omit<WaitlistEntry, 'id'>) => {
    const newEntry: WaitlistEntry = {
      ...entry,
      id: generateId(),
    };
    setWaitlist((prev) => [...prev, newEntry]);
    return newEntry;
  };

  const removeFromWaitlist = (id: string) => {
    setWaitlist((prev) => prev.filter((entry) => entry.id !== id));
  };

  const getWaitlistByProgram = (programLevel: string) => {
    return waitlist
      .filter((entry) => entry.programLevel === programLevel)
      .sort((a, b) => b.priority - a.priority || new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getWaitlistByStudent = (studentId: string) => {
    return waitlist.find((entry) => entry.studentId === studentId);
  };

  return {
    waitlist,
    isLoaded,
    addToWaitlist,
    removeFromWaitlist,
    getWaitlistByProgram,
    getWaitlistByStudent,
  };
}
