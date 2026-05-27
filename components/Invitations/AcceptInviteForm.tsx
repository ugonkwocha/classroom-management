'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

interface AcceptInviteFormProps {
  token: string;
}

interface InvitationPreview {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  expiresAt: string;
}

export function AcceptInviteForm({ token }: AcceptInviteFormProps) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    async function verifyInvitation() {
      if (!token) {
        setError('Invitation token is missing.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/invitations/verify?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Invitation could not be verified');
        }

        setInvitation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invitation could not be verified');
      } finally {
        setIsLoading(false);
      }
    }

    verifyInvitation();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/users/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setIsComplete(true);
      setTimeout(() => router.push('/login'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <Image
          src="/brand/9jacodekids-main-logo.png"
          alt="9jacodekids"
          width={250}
          height={61}
          priority
          className="mx-auto h-14 w-auto"
        />
        <h1 className="mt-4 text-2xl font-bold text-slate-950">Accept invitation</h1>
        <p className="mt-2 text-sm text-slate-500">Create your account password to join the platform.</p>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm font-medium text-slate-600">
          Checking invitation...
        </div>
      )}

      {!isLoading && error && !invitation && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
          <Link href="/login" className="block text-center text-sm font-bold text-blue-600">
            Back to sign in
          </Link>
        </div>
      )}

      {!isLoading && invitation && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-950">
              {invitation.firstName} {invitation.lastName}
            </p>
            <p className="mt-1 text-sm text-blue-700">{invitation.email}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-blue-500">
              Role: {invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()}
            </p>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-bold text-slate-700">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
              placeholder="Repeat password"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          {isComplete && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              Account created. Redirecting to sign in...
            </div>
          )}

          <Button type="submit" disabled={isSubmitting || isComplete} className="w-full">
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      )}
    </div>
  );
}
