'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui';
import { FiArrowRight, FiLock, FiMail, FiShield } from 'react-icons/fi';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/?tab=dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden bg-[#06244a] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <Image
            src="/brand/9ck-white-full-logo.png"
            alt="9jacodekids"
            width={260}
            height={80}
            priority
            className="h-14 w-auto"
          />
          <div className="mt-12">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-300">Academy operations</p>
            <h1 className="mt-4 max-w-sm text-4xl font-black leading-tight">
              Classroom management for 9jacodekids Academy.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-blue-100">
              Manage families, students, enrollments, classes, tutors, pricing, and reports from one secure admin workspace.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-300 text-[#06244a]">
              <FiShield className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Invite-only access</p>
              <p className="mt-1 text-xs text-blue-100">Admins and staff join through secure invitations.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="p-7 sm:p-10 lg:p-12">
        <div className="mb-9 lg:hidden">
          <Image
            src="/brand/9jacodekids-main-logo.png"
            alt="9jacodekids"
            width={250}
            height={61}
            priority
            className="h-12 w-auto"
          />
        </div>

        <div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiLock className="h-5 w-5" />
          </span>
          <h2 className="mt-5 text-3xl font-black text-slate-950">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Access the 9jacodekids Academy classroom management system.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700">
              Email
            </label>
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 shadow-sm focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50">
              <FiMail className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="name@9jacodekids.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">
              Password
            </label>
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 shadow-sm focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50">
              <FiLock className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !email || !password}
            className="h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
            {!isLoading && <FiArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-xs font-medium leading-5 text-slate-500">
          Need access? Ask a superadmin or admin to send you an invitation.
        </p>
      </section>
    </div>
  );
}
