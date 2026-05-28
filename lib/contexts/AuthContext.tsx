'use client';

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { User, UserRole } from '@/types';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_WARNING_MS = 28 * 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 15 * 1000;
const AUTH_LAST_ACTIVITY_KEY = 'authLastActivityAt';
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousedown', 'mousemove', 'scroll', 'touchstart'];

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ token: string; user: User }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const lastActivityWriteRef = useRef(0);

  const markActivity = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastActivityWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) {
      return;
    }

    lastActivityWriteRef.current = now;
    localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
    setShowIdleWarning(false);
  }, []);

  const refreshUser = useCallback(async (setLoading = true) => {
    if (setLoading) {
      setIsLoading(true);
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setUser(null);
        localStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
        if (setLoading) {
          setIsLoading(false);
        }
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    } finally {
      if (setLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initialize auth state on mount only
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      refreshUser(true);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const { token, user: userData } = await response.json();
      localStorage.setItem('authToken', token);
      markActivity(true);
      setUser(userData);
      return { token, user: userData };
    },
    [markActivity]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
    setShowIdleWarning(false);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!user) {
      setShowIdleWarning(false);
      return;
    }

    if (!localStorage.getItem(AUTH_LAST_ACTIVITY_KEY)) {
      markActivity(true);
    }

    const handleActivity = () => markActivity();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    const intervalId = window.setInterval(() => {
      const lastActivityAt = Number(localStorage.getItem(AUTH_LAST_ACTIVITY_KEY) || Date.now());
      const idleFor = Date.now() - lastActivityAt;

      if (idleFor >= IDLE_TIMEOUT_MS) {
        logout();
        return;
      }

      setShowIdleWarning(idleFor >= IDLE_WARNING_MS);
    }, 15 * 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.clearInterval(intervalId);
    };
  }, [logout, markActivity, user]);

  const checkPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      return hasPermission(user.role, permission as any);
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission: checkPermission,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showIdleWarning && user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <span className="text-xl font-black">!</span>
            </div>
            <h2 className="text-xl font-bold text-slate-950">Still working?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              You have been inactive for a while. For security, you will be signed out soon unless you stay signed in.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => markActivity(true)}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
              >
                Sign out now
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
