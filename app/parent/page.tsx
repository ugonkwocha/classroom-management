'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiExternalLink,
  FiHome,
  FiLogOut,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '@/lib/hooks/useAuth';

type ParentEnrollment = {
  id: string;
  batchNumber: number;
  enrollmentDate: string;
  status: 'WAITLIST' | 'ASSIGNED' | 'COMPLETED';
  paymentStatus: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
  confirmedAmount: number;
  lastPaymentConfirmedAt: string | null;
  attendance: { total: number; present: number; late: number; absent: number; excused: number };
  latestProgressUpdate: null | {
    rating: 'EXCEEDING' | 'ON_TRACK' | 'NEEDS_SUPPORT';
    summary: string;
    strengths: string | null;
    focusAreas: string | null;
    createdAt: string;
    sessionTitle: string;
    sessionHeldAt: string;
  };
  program: {
    id: string;
    name: string;
    season: string;
    year: number;
    startDate: string;
  };
  class: null | {
    id: string;
    name: string;
    schedule: string;
    slot: string | null;
    meetLink: string | null;
    course: { id: string; name: string };
    tutorName: string | null;
    latestSession: null | {
      title: string;
      topics: string;
      summary: string | null;
      homework: string | null;
      heldAt: string;
    };
  };
};

type ParentDashboard = {
  guardian: { firstName: string; lastName: string };
  summary: {
    familyCount: number;
    childCount: number;
    activeEnrollmentCount: number;
    awaitingClassCount: number;
    pendingPaymentCount: number;
  };
  families: Array<{
    id: string;
    displayName: string;
    guardians: Array<{
      id: string;
      firstName: string;
      lastName: string;
      relationship: string;
      isPrimary: boolean;
    }>;
    children: Array<{
      id: string;
      firstName: string;
      lastName: string;
      isReturningStudent: boolean;
      enrollments: ParentEnrollment[];
    }>;
  }>;
};

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export default function ParentDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [dashboard, setDashboard] = useState<ParentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isParent = user?.roleSlugs?.includes('parent') ?? false;
  const isInternal = user?.roleSlugs?.some((role) => ['superadmin', 'admin', 'staff'].includes(role)) ?? false;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!isParent) {
      router.replace(isInternal ? '/?tab=dashboard' : '/login');
      return;
    }

    let active = true;
    async function loadDashboard() {
      try {
        const response = await fetch('/api/portal/parent/dashboard');
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load your family dashboard');
        if (active) setDashboard(body);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your family dashboard');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, [authLoading, isAuthenticated, isInternal, isParent, router]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (authLoading || isLoading || !isAuthenticated || !isParent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading your family dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-[#06244a] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Image src="/brand/9ck-white-full-logo.png" alt="9jacodekids" width={220} height={64} className="h-10 w-auto" priority />
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-blue-100 sm:inline">Parent Portal</span>
          </div>
          <div className="flex items-center gap-2">
            {isInternal && (
              <Link href="/?tab=dashboard" className="hidden rounded-xl border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/10 sm:inline-flex">
                Admin workspace
              </Link>
            )}
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/10">
              <FiLogOut /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-black">We couldn’t load your family</h1>
            <p className="mt-3 text-sm leading-6 text-rose-700">{error}</p>
            <p className="mt-3 text-sm text-slate-500">Please contact the academy so we can review the email attached to your enrollment.</p>
          </section>
        ) : dashboard ? (
          <>
            <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-[#06244a] p-7 text-white shadow-xl shadow-blue-950/10 sm:p-9">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-300">Family dashboard</p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">Welcome, {dashboard.guardian.firstName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">Here is the latest information connected to your children at 9jacodekids Academy.</p>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'Children', value: dashboard.summary.childCount, icon: FiUsers, tone: 'text-blue-600 bg-blue-50' },
                { label: 'Active enrollments', value: dashboard.summary.activeEnrollmentCount, icon: FiBookOpen, tone: 'text-violet-600 bg-violet-50' },
                { label: 'Awaiting class', value: dashboard.summary.awaitingClassCount, icon: FiClock, tone: 'text-amber-600 bg-amber-50' },
                { label: 'Pending payment', value: dashboard.summary.pendingPaymentCount, icon: FiCreditCard, tone: 'text-rose-600 bg-rose-50' },
                { label: 'Families', value: dashboard.summary.familyCount, icon: FiHome, tone: 'text-emerald-600 bg-emerald-50' },
              ].map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon /></span>
                  <p className="mt-4 text-3xl font-black">{value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                </div>
              ))}
            </section>

            <div className="mt-8 space-y-8">
              {dashboard.families.map((family) => (
                <section key={family.id}>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Your family</p>
                      <h2 className="mt-1 text-2xl font-black">{family.displayName}</h2>
                    </div>
                    <p className="text-sm text-slate-500">{family.guardians.length} active guardian{family.guardians.length === 1 ? '' : 's'}</p>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    {family.children.map((child) => (
                      <article key={child.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Student</p>
                              <h3 className="mt-1 text-xl font-black">{child.firstName} {child.lastName}</h3>
                            </div>
                            {child.isReturningStudent && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Returning learner</span>}
                          </div>
                        </div>

                        <div className="space-y-4 p-6">
                          {child.enrollments.length === 0 ? (
                            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No current enrollment is linked yet.</p>
                          ) : child.enrollments.map((enrollment) => (
                            <div key={enrollment.id} className="rounded-2xl border border-slate-200 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-black">{enrollment.program.name} {enrollment.program.year}</p>
                                  <p className="mt-1 text-xs font-medium text-slate-500">Batch {enrollment.batchNumber} · {enrollment.status === 'WAITLIST' ? 'Awaiting class assignment' : enrollment.status.toLowerCase()}</p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${enrollment.paymentStatus === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {enrollment.paymentStatus === 'PENDING' ? 'Payment pending' : 'Payment confirmed'}
                                </span>
                              </div>

                              {enrollment.confirmedAmount > 0 && (
                                <p className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-700"><FiCheckCircle /> {currency.format(enrollment.confirmedAmount)} confirmed</p>
                              )}

                              {enrollment.class ? (
                                <>
                                  <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-950">
                                    <p className="font-black">{enrollment.class.course.name}</p>
                                    <p className="mt-2 flex items-start gap-2 leading-6"><FiCalendar className="mt-1 shrink-0" /> {enrollment.class.schedule}</p>
                                    {enrollment.class.slot && <p className="mt-1 text-blue-800">{enrollment.class.slot}</p>}
                                    <p className="mt-1 text-blue-800">Tutor: {enrollment.class.tutorName || 'To be assigned'}</p>
                                    {enrollment.class.meetLink && (
                                      <a href={enrollment.class.meetLink} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700">
                                        Open class link <FiExternalLink />
                                      </a>
                                    )}
                                  </div>

                                  {enrollment.class.latestSession && (
                                    <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-4 text-sm">
                                      <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Latest class recap</p>
                                      <p className="mt-2 font-black text-slate-900">{enrollment.class.latestSession.title}</p>
                                      <p className="mt-1 text-xs text-slate-500">{new Date(enrollment.class.latestSession.heldAt).toLocaleDateString()}</p>
                                      <p className="mt-3 leading-6 text-slate-700"><strong>Topics:</strong> {enrollment.class.latestSession.topics}</p>
                                      {enrollment.class.latestSession.summary && <p className="mt-2 leading-6 text-slate-600">{enrollment.class.latestSession.summary}</p>}
                                      {enrollment.class.latestSession.homework && <p className="mt-2 rounded-xl bg-amber-50 p-3 leading-6 text-amber-900"><strong>Next step:</strong> {enrollment.class.latestSession.homework}</p>}
                                    </div>
                                  )}

                                  {enrollment.attendance.total > 0 && (
                                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                      <p className="font-black text-slate-900">Attendance</p>
                                      <p className="mt-2 text-slate-600">
                                        {enrollment.attendance.present} present · {enrollment.attendance.late} late · {enrollment.attendance.absent} absent · {enrollment.attendance.excused} excused
                                      </p>
                                    </div>
                                  )}

                                  {enrollment.latestProgressUpdate && (
                                    <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-950">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-black">Latest tutor update</p>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-700">
                                          {enrollment.latestProgressUpdate.rating === 'EXCEEDING'
                                            ? 'Exceeding expectations'
                                            : enrollment.latestProgressUpdate.rating === 'ON_TRACK'
                                              ? 'On track'
                                              : 'Needs support'}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-xs font-bold text-violet-600">{enrollment.latestProgressUpdate.sessionTitle}</p>
                                      <p className="mt-2 leading-6 text-violet-900">{enrollment.latestProgressUpdate.summary}</p>
                                      {enrollment.latestProgressUpdate.strengths && <p className="mt-2"><strong>Strength:</strong> {enrollment.latestProgressUpdate.strengths}</p>}
                                      {enrollment.latestProgressUpdate.focusAreas && <p className="mt-1"><strong>Focus next:</strong> {enrollment.latestProgressUpdate.focusAreas}</p>}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">The academy is still assigning this enrollment to a class.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
