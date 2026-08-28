'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiMail, FiShield } from 'react-icons/fi';

export default function ParentAccessPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/parent-access/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      setMessage(body.message || 'Check your email for the next step.');
    } catch {
      setMessage('If that email matches an active family record, we will send a secure setup link shortly.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-[#06244a] p-8 text-white sm:p-10">
          <Image src="/brand/9ck-white-full-logo.png" alt="9jacodekids" width={250} height={70} className="h-12 w-auto" priority />
          <p className="mt-12 text-sm font-bold uppercase tracking-[0.22em] text-yellow-300">Parent portal</p>
          <h1 className="mt-4 text-4xl font-black leading-tight">Stay connected to your child’s learning.</h1>
          <p className="mt-5 text-sm leading-7 text-blue-100">
            View class details, enrollment status, payment confirmation and the learning information connected to your family.
          </p>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/10 p-5">
            <FiShield className="h-6 w-6 text-yellow-300" />
            <p className="mt-3 font-bold">Secure family matching</p>
            <p className="mt-1 text-sm leading-6 text-blue-100">Use the same email address provided during enrollment.</p>
          </div>
        </section>

        <section className="p-7 sm:p-10 lg:p-12">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600">
            <FiArrowLeft /> Back to sign in
          </Link>

          {message ? (
            <div className="mt-12">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <FiCheckCircle className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-3xl font-black text-slate-950">Check your email</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
              <button
                type="button"
                onClick={() => setMessage('')}
                className="mt-7 text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                Try another email
              </button>
            </div>
          ) : (
            <>
              <span className="mt-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FiMail className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-3xl font-black text-slate-950">Find your family account</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                We’ll email you a secure link to claim or connect your parent account.
              </p>

              <form onSubmit={handleSubmit} className="mt-8">
                <label htmlFor="parent-email" className="mb-2 block text-sm font-bold text-slate-700">Enrollment email</label>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50">
                  <FiMail className="mr-3 h-5 w-5 text-slate-400" />
                  <input
                    id="parent-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    placeholder="parent@example.com"
                    className="h-12 w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Checking securely...' : 'Email my secure link'}
                  {!isSubmitting && <FiArrowRight />}
                </button>
              </form>

              <p className="mt-6 text-xs leading-5 text-slate-500">
                For privacy, we show the same confirmation whether or not an email matches our records. Contact the academy if your enrollment email has changed.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
