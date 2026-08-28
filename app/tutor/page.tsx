'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiLogOut,
  FiSave,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '@/lib/hooks/useAuth';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
type ProgressRating = 'EXCEEDING' | 'ON_TRACK' | 'NEEDS_SUPPORT';

type TutorStudent = {
  enrollmentId: string;
  id: string;
  firstName: string;
  lastName: string;
  isReturningStudent: boolean;
};

type TutorSession = {
  id: string;
  heldAt: string;
  title: string;
  topics: string;
  summary: string | null;
  homework: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  parentVisible: boolean;
  createdAt: string;
  attendance: Array<{ studentId: string; status: AttendanceStatus; notes: string | null }>;
  progressUpdates: Array<{
    studentId: string;
    rating: ProgressRating;
    summary: string;
    strengths: string | null;
    focusAreas: string | null;
    parentVisible: boolean;
  }>;
};

type TutorClass = {
  id: string;
  name: string;
  schedule: string;
  slot: string;
  batch: number;
  meetLink: string | null;
  course: { id: string; name: string };
  program: { id: string; name: string; season: string; year: number };
  roster: TutorStudent[];
  sessions: TutorSession[];
};

type TutorDashboard = {
  tutor: { id: string; firstName: string; lastName: string; email: string; status: string };
  summary: {
    classCount: number;
    studentCount: number;
    recordedSessionCount: number;
    classesWithoutSessionCount: number;
  };
  classes: TutorClass[];
};

type StudentEntry = {
  attendance: AttendanceStatus;
  attendanceNotes: string;
  rating: ProgressRating;
  progressSummary: string;
  strengths: string;
  focusAreas: string;
  parentVisible: boolean;
};

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function createStudentEntries(roster: TutorStudent[]): Record<string, StudentEntry> {
  return Object.fromEntries(
    roster.map((student) => [
      student.id,
      {
        attendance: 'PRESENT' as AttendanceStatus,
        attendanceNotes: '',
        rating: 'ON_TRACK' as ProgressRating,
        progressSummary: '',
        strengths: '',
        focusAreas: '',
        parentVisible: true,
      },
    ])
  );
}

export default function TutorDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [dashboard, setDashboard] = useState<TutorDashboard | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [heldAt, setHeldAt] = useState(localDateTimeValue());
  const [title, setTitle] = useState('');
  const [topics, setTopics] = useState('');
  const [summary, setSummary] = useState('');
  const [homework, setHomework] = useState('');
  const [parentVisible, setParentVisible] = useState(true);
  const [studentEntries, setStudentEntries] = useState<Record<string, StudentEntry>>({});

  const isTutor = user?.roleSlugs?.includes('tutor') ?? false;
  const isInternal = user?.roleSlugs?.some((role) => ['superadmin', 'admin', 'staff'].includes(role)) ?? false;
  const selectedClass = useMemo(
    () => dashboard?.classes.find((item) => item.id === selectedClassId) || dashboard?.classes[0] || null,
    [dashboard, selectedClassId]
  );

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/portal/tutor/dashboard');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load tutor dashboard');
      setDashboard(body);
      setSelectedClassId((current) => current || body.classes[0]?.id || '');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load tutor dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!isTutor) {
      router.replace(isInternal ? '/?tab=dashboard' : '/login');
      return;
    }
    void loadDashboard();
  }, [authLoading, isAuthenticated, isInternal, isTutor, loadDashboard, router]);

  useEffect(() => {
    if (selectedClass) setStudentEntries(createStudentEntries(selectedClass.roster));
  }, [selectedClass]);

  function updateStudent(studentId: string, changes: Partial<StudentEntry>) {
    setStudentEntries((current) => ({
      ...current,
      [studentId]: { ...current[studentId], ...changes },
    }));
  }

  function resetForm() {
    setHeldAt(localDateTimeValue());
    setTitle('');
    setTopics('');
    setSummary('');
    setHomework('');
    setParentVisible(true);
    setStudentEntries(createStudentEntries(selectedClass?.roster || []));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedClass) return;
    setError('');
    setNotice('');
    setIsSubmitting(true);

    const attendance = selectedClass.roster.map((student) => ({
      studentId: student.id,
      status: studentEntries[student.id]?.attendance || 'PRESENT',
      notes: studentEntries[student.id]?.attendanceNotes || '',
    }));
    const progressUpdates = selectedClass.roster
      .filter((student) => studentEntries[student.id]?.progressSummary.trim())
      .map((student) => ({
        studentId: student.id,
        rating: studentEntries[student.id].rating,
        summary: studentEntries[student.id].progressSummary,
        strengths: studentEntries[student.id].strengths,
        focusAreas: studentEntries[student.id].focusAreas,
        parentVisible: studentEntries[student.id].parentVisible,
      }));

    try {
      const response = await fetch(`/api/portal/tutor/classes/${selectedClass.id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heldAt: new Date(heldAt).toISOString(),
          title,
          topics,
          summary,
          homework,
          status: 'COMPLETED',
          parentVisible,
          attendance,
          progressUpdates,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to save this class session');
      setNotice('Class session, attendance, and progress updates saved.');
      resetForm();
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this class session');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (authLoading || isLoading || !isAuthenticated || !isTutor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading your teaching workspace...</p>
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
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-blue-100 sm:inline">Tutor Portal</span>
          </div>
          <div className="flex items-center gap-2">
            {isInternal && <Link href="/?tab=dashboard" className="hidden rounded-xl border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/10 sm:inline-flex">Admin workspace</Link>}
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/10"><FiLogOut /> Sign out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-br from-violet-700 to-[#06244a] p-7 text-white shadow-xl shadow-blue-950/10 sm:p-9">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-300">Teaching dashboard</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Welcome, {dashboard?.tutor.firstName}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">Manage only your assigned classes, attendance, lesson recaps, and learner progress.</p>
        </section>

        {error && <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>}
        {notice && <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{notice}</div>}

        {dashboard && (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Assigned classes', value: dashboard.summary.classCount, icon: FiBookOpen, tone: 'bg-violet-50 text-violet-600' },
                { label: 'Unique learners', value: dashboard.summary.studentCount, icon: FiUsers, tone: 'bg-blue-50 text-blue-600' },
                { label: 'Sessions recorded', value: dashboard.summary.recordedSessionCount, icon: FiCheckCircle, tone: 'bg-emerald-50 text-emerald-600' },
                { label: 'Classes to start', value: dashboard.summary.classesWithoutSessionCount, icon: FiClock, tone: 'bg-amber-50 text-amber-600' },
              ].map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon /></span>
                  <p className="mt-4 text-3xl font-black">{value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                </div>
              ))}
            </section>

            {dashboard.classes.length === 0 ? (
              <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <h2 className="text-xl font-black">No active classes assigned</h2>
                <p className="mt-2 text-sm text-slate-500">An academy administrator must assign your tutor profile to a class.</p>
              </section>
            ) : selectedClass ? (
              <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
                <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="px-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">My classes</p>
                  <div className="mt-3 space-y-2">
                    {dashboard.classes.map((classRecord) => (
                      <button key={classRecord.id} type="button" onClick={() => setSelectedClassId(classRecord.id)} className={`w-full rounded-2xl p-4 text-left transition ${selectedClass.id === classRecord.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-800 hover:bg-blue-50'}`}>
                        <span className="block font-black">{classRecord.course.name}</span>
                        <span className={`mt-1 block text-xs ${selectedClass.id === classRecord.id ? 'text-blue-100' : 'text-slate-500'}`}>{classRecord.name} · {classRecord.roster.length} learners</span>
                      </button>
                    ))}
                  </div>
                </aside>

                <div className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Assigned class</p>
                        <h2 className="mt-2 text-2xl font-black">{selectedClass.course.name}</h2>
                        <p className="mt-1 text-sm text-slate-500">{selectedClass.program.name} {selectedClass.program.year} · Batch {selectedClass.batch}</p>
                        <p className="mt-3 flex items-start gap-2 text-sm font-medium text-slate-700"><FiCalendar className="mt-0.5" /> {selectedClass.schedule}</p>
                      </div>
                      {selectedClass.meetLink && <a href={selectedClass.meetLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">Open class link <FiExternalLink /></a>}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Roster</p>
                        <h2 className="mt-1 text-xl font-black">Assigned learners</h2>
                      </div>
                      <span className="text-sm font-bold text-slate-500">{selectedClass.roster.length} learners</span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {selectedClass.roster.map((student) => (
                        <div key={student.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="font-black">{student.firstName} {student.lastName}</p>
                          <p className="mt-1 text-xs text-slate-500">{student.isReturningStudent ? 'Returning learner' : 'New learner'}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Record class delivery</p>
                      <h2 className="mt-1 text-2xl font-black">Class session and attendance</h2>
                      <p className="mt-2 text-sm text-slate-500">Save what was taught, mark every learner, and optionally share individual progress with parents.</p>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-bold text-slate-700">Session date and time<input type="datetime-local" value={heldAt} onChange={(event) => setHeldAt(event.target.value)} required className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-medium outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50" /></label>
                      <label className="text-sm font-bold text-slate-700">Session title<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} placeholder="Week 2: Building the navigation" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-medium outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50" /></label>
                    </div>
                    <label className="mt-4 block text-sm font-bold text-slate-700">Topics covered<textarea value={topics} onChange={(event) => setTopics(event.target.value)} required maxLength={2000} rows={3} placeholder="List the concepts and practical work completed." className="mt-2 w-full rounded-xl border border-slate-200 p-4 font-medium outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50" /></label>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-bold text-slate-700">Lesson recap<textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={5000} rows={3} placeholder="A short recap for the academy and parents." className="mt-2 w-full rounded-xl border border-slate-200 p-4 font-medium outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50" /></label>
                      <label className="text-sm font-bold text-slate-700">Homework or next step<textarea value={homework} onChange={(event) => setHomework(event.target.value)} maxLength={3000} rows={3} placeholder="Optional practice before the next class." className="mt-2 w-full rounded-xl border border-slate-200 p-4 font-medium outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50" /></label>
                    </div>
                    <label className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-900"><input type="checkbox" checked={parentVisible} onChange={(event) => setParentVisible(event.target.checked)} className="h-4 w-4" /> Make this lesson recap visible to parents</label>

                    <div className="mt-7 space-y-4">
                      {selectedClass.roster.map((student) => {
                        const entry = studentEntries[student.id];
                        if (!entry) return null;
                        return (
                          <div key={student.id} className="rounded-2xl border border-slate-200 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <h3 className="font-black">{student.firstName} {student.lastName}</h3>
                              <select value={entry.attendance} onChange={(event) => updateStudent(student.id, { attendance: event.target.value as AttendanceStatus })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold">
                                <option value="PRESENT">Present</option><option value="LATE">Late</option><option value="ABSENT">Absent</option><option value="EXCUSED">Excused</option>
                              </select>
                            </div>
                            <input value={entry.attendanceNotes} onChange={(event) => updateStudent(student.id, { attendanceNotes: event.target.value })} maxLength={500} placeholder="Optional attendance note" className="mt-3 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" />
                            <details className="mt-3 rounded-xl bg-violet-50 p-4">
                              <summary className="cursor-pointer text-sm font-black text-violet-900">Add parent-visible progress update</summary>
                              <div className="mt-4 space-y-3">
                                <select value={entry.rating} onChange={(event) => updateStudent(student.id, { rating: event.target.value as ProgressRating })} className="h-11 w-full rounded-xl border border-violet-100 bg-white px-3 text-sm font-bold"><option value="EXCEEDING">Exceeding expectations</option><option value="ON_TRACK">On track</option><option value="NEEDS_SUPPORT">Needs support</option></select>
                                <textarea value={entry.progressSummary} onChange={(event) => updateStudent(student.id, { progressSummary: event.target.value })} maxLength={2000} rows={3} placeholder="What should the parent know about this learner's progress?" className="w-full rounded-xl border border-violet-100 bg-white p-3 text-sm outline-none" />
                                <div className="grid gap-3 sm:grid-cols-2"><input value={entry.strengths} onChange={(event) => updateStudent(student.id, { strengths: event.target.value })} maxLength={1000} placeholder="Strength demonstrated" className="h-11 rounded-xl border border-violet-100 bg-white px-3 text-sm outline-none" /><input value={entry.focusAreas} onChange={(event) => updateStudent(student.id, { focusAreas: event.target.value })} maxLength={1000} placeholder="Focus area for next class" className="h-11 rounded-xl border border-violet-100 bg-white px-3 text-sm outline-none" /></div>
                                <label className="flex items-center gap-2 text-xs font-bold text-violet-800"><input type="checkbox" checked={entry.parentVisible} onChange={(event) => updateStudent(student.id, { parentVisible: event.target.checked })} /> Share this update with the parent</label>
                              </div>
                            </details>
                          </div>
                        );
                      })}
                    </div>

                    <button type="submit" disabled={isSubmitting || selectedClass.roster.length === 0} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"><FiSave /> {isSubmitting ? 'Saving class session...' : 'Save class session'}</button>
                  </form>

                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-black">Recent class sessions</h2>
                    <div className="mt-5 space-y-3">
                      {selectedClass.sessions.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No sessions recorded yet.</p> : selectedClass.sessions.map((session) => (
                        <article key={session.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{session.title}</p><p className="mt-1 text-xs font-medium text-slate-500">{new Date(session.heldAt).toLocaleString()}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{session.attendance.filter((item) => item.status === 'PRESENT').length}/{session.attendance.length} present</span></div>
                          <p className="mt-3 text-sm leading-6 text-slate-700"><strong>Topics:</strong> {session.topics}</p>
                          {session.summary && <p className="mt-2 text-sm leading-6 text-slate-600">{session.summary}</p>}
                          <p className="mt-3 text-xs font-bold text-violet-600">{session.progressUpdates.length} learner update{session.progressUpdates.length === 1 ? '' : 's'} recorded</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
