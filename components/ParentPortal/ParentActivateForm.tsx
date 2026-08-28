'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowRight, FiCheckCircle, FiEye, FiEyeOff, FiLock } from 'react-icons/fi';

type Verification = {
  firstName: string;
  accountExists: boolean;
  accountActive: boolean;
};

export function ParentActivateForm({ token }: { token: string }) {
  const [verification, setVerification] = useState<Verification | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    async function verify() {
      if (!token) {
        setError('This setup link is missing or invalid.');
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/parent-access/verify?token=${encodeURIComponent(token)}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to verify this setup link');
        if (active) setVerification(body);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to verify this setup link');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void verify();
    return () => { active = false; };
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!verification?.accountExists) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmation) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/parent-access/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: verification?.accountExists ? undefined : password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to complete account setup');
      setComplete(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to complete account setup');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-200/70 sm:p-10">
        <Image src="/brand/9jacodekids-main-logo.png" alt="9jacodekids" width={250} height={61} className="h-12 w-auto" priority />

        {isLoading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-4 text-sm text-slate-500">Checking your secure link...</p>
          </div>
        ) : complete ? (
          <div className="pt-10">
            <FiCheckCircle className="h-14 w-14 text-emerald-500" />
            <h1 className="mt-5 text-3xl font-black text-slate-950">Parent access is ready</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {verification?.accountExists
                ? 'Your family has been connected to your existing account. Sign in with your current password.'
                : 'Your parent account has been created. Sign in to view your family dashboard.'}
            </p>
            <Link href="/login" className="mt-7 inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white hover:bg-blue-700">
              Continue to sign in <FiArrowRight />
            </Link>
          </div>
        ) : error && !verification ? (
          <div className="pt-10">
            <h1 className="text-3xl font-black text-slate-950">We couldn’t use this link</h1>
            <p className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-700">{error}</p>
            <Link href="/parent-access" className="mt-7 inline-flex font-bold text-blue-600">Request another secure link</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pt-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FiLock /></span>
            <h1 className="mt-5 text-3xl font-black text-slate-950">
              {verification?.accountExists ? `Connect your family access` : `Welcome, ${verification?.firstName}`}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {verification?.accountExists
                ? 'Confirm below to connect the family records matched to your verified email.'
                : 'Choose a password for your new parent portal account.'}
            </p>

            {!verification?.accountExists && (
              <div className="mt-7 space-y-4">
                {[{ id: 'password', label: 'Password', value: password, set: setPassword }, { id: 'confirmation', label: 'Confirm password', value: confirmation, set: setConfirmation }].map((field) => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="mb-2 block text-sm font-bold text-slate-700">{field.label}</label>
                    <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50">
                      <input
                        id={field.id}
                        type={showPassword ? 'text' : 'password'}
                        value={field.value}
                        onChange={(event) => field.set(event.target.value)}
                        autoComplete={field.id === 'password' ? 'new-password' : 'new-password'}
                        required
                        className="h-12 w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                      />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="text-slate-400 hover:text-blue-600">
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={isSubmitting || !verification?.accountActive} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Setting up access...' : verification?.accountExists ? 'Connect my parent access' : 'Create my parent account'}
              {!isSubmitting && <FiArrowRight />}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
