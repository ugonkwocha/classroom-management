'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClipboard,
  FiCreditCard,
  FiFilter,
  FiSearch,
  FiSend,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import { useClasses, useCourses, usePrograms, useStudents, useTeachers } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { normalizePaymentStatus } from '@/lib/student-payment-status';
import type { Class, CourseHistory, Program, ProgramEnrollment, Student } from '@/types';

type EnrollmentStatus = ProgramEnrollment['status'];
type PaymentStatus = Exclude<NonNullable<ProgramEnrollment['paymentStatus']>, 'COMPLETED'>;
type AssignmentFilter = 'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'READY';

type EnrollmentRow = {
  enrollment: ProgramEnrollment;
  student: Student;
  program?: Program;
  classItem?: Class;
};

const enrollmentStatuses: EnrollmentStatus[] = ['WAITLIST', 'ASSIGNED', 'COMPLETED', 'DROPPED'];
const paymentStatuses: PaymentStatus[] = ['PENDING', 'CONFIRMED'];

const statusStyles: Record<EnrollmentStatus, string> = {
  WAITLIST: 'border-amber-100 bg-amber-50 text-amber-700',
  ASSIGNED: 'border-blue-100 bg-blue-50 text-blue-700',
  COMPLETED: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  DROPPED: 'border-slate-200 bg-slate-100 text-slate-600',
};

const paymentStyles: Record<PaymentStatus, string> = {
  PENDING: 'border-amber-100 bg-amber-50 text-amber-700',
  CONFIRMED: 'border-blue-100 bg-blue-50 text-blue-700',
};

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCurrency(amount?: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(date?: string) {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStudentEnrollments(student: Student) {
  return student.programEnrollments || student.enrollments || [];
}

function deriveStudentPaymentStatus(enrollments: ProgramEnrollment[]): Student['paymentStatus'] {
  if (enrollments.some((enrollment) => normalizePaymentStatus(enrollment.paymentStatus) === 'CONFIRMED')) return 'CONFIRMED';
  return 'PENDING';
}

function buildCourseHistoryEntry(student: Student, classItem: Class, program?: Program): CourseHistory | null {
  const alreadyInProgress = (student.courseHistory || []).some(
    (history) =>
      history.courseId === classItem.courseId &&
      history.programId === classItem.programId &&
      history.completionStatus === 'IN_PROGRESS'
  );

  if (alreadyInProgress) return null;

  return {
    id: `pending-${Date.now()}`,
    courseId: classItem.courseId,
    courseName: classItem.name,
    programId: program?.id || classItem.programId,
    programName: program?.name || '',
    batch: classItem.batch,
    year: program?.year,
    completionStatus: 'IN_PROGRESS',
    startDate: new Date().toISOString(),
    dateAdded: new Date().toISOString(),
  };
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: IconType;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Pill({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

export function EnrollmentManagement() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { students, isLoaded: studentsLoaded, updateStudent } = useStudents();
  const { classes, isLoaded: classesLoaded } = useClasses();
  const { programs, isLoaded: programsLoaded } = usePrograms();
  const { courses } = useCourses();
  const { teachers } = useTeachers();
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EnrollmentStatus>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('ALL');
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canUpdate = hasPermission(PERMISSIONS.UPDATE_ENROLLMENT);
  const isLoaded = studentsLoaded && classesLoaded && programsLoaded;

  const rows = useMemo<EnrollmentRow[]>(() => {
    return students.flatMap((student) =>
      getStudentEnrollments(student).map((enrollment) => {
        const embeddedEnrollment = enrollment as ProgramEnrollment & { program?: Program; class?: Class | null };
        const program = embeddedEnrollment.program || programs.find((item) => item.id === enrollment.programId);
        const classItem = embeddedEnrollment.class || classes.find((item) => item.id === enrollment.classId);

        return {
          enrollment,
          student,
          program,
          classItem: classItem || undefined,
        };
      })
    );
  }, [classes, programs, students]);

  const years = useMemo(() => {
    return Array.from(new Set(programs.map((program) => program.year))).sort((a, b) => b - a);
  }, [programs]);

  const getAssignedCount = (classId: string, excludedEnrollmentId?: string) =>
    rows.filter(
      (row) =>
        row.enrollment.id !== excludedEnrollmentId &&
        row.enrollment.classId === classId &&
        row.enrollment.status === 'ASSIGNED'
    ).length;

  const getAvailableClasses = (row: EnrollmentRow) =>
    classes
      .filter(
        (classItem) =>
          !classItem.isArchived &&
          classItem.programId === row.enrollment.programId &&
          classItem.batch === row.enrollment.batchNumber
      )
      .sort((a, b) => a.name.localeCompare(b.name));

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const classItem = row.classItem;
      const program = row.program;
      const teacher = classItem?.teacherId ? teachers.find((item) => item.id === classItem.teacherId) : undefined;
      const course = classItem?.courseId ? courses.find((item) => item.id === classItem.courseId) : undefined;
      const studentName = `${row.student.firstName} ${row.student.lastName}`.toLowerCase();
      const haystack = [
        studentName,
        row.student.email,
        row.student.parentEmail,
        row.student.parentPhone,
        program?.name,
        program?.season,
        classItem?.name,
        classItem?.slot,
        course?.name,
        teacher ? `${teacher.firstName} ${teacher.lastName}` : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const paymentStatus = normalizePaymentStatus(row.enrollment.paymentStatus);
      const assigned = row.enrollment.status === 'ASSIGNED' && Boolean(row.enrollment.classId);
      const ready = !assigned && paymentStatus === 'CONFIRMED';

      return (
        (!normalizedSearch || haystack.includes(normalizedSearch)) &&
        (programFilter === 'ALL' || row.enrollment.programId === programFilter) &&
        (yearFilter === 'ALL' || String(program?.year) === yearFilter) &&
        (statusFilter === 'ALL' || row.enrollment.status === statusFilter) &&
        (paymentFilter === 'ALL' || paymentStatus === paymentFilter) &&
        (assignmentFilter === 'ALL' ||
          (assignmentFilter === 'ASSIGNED' && assigned) ||
          (assignmentFilter === 'UNASSIGNED' && !assigned) ||
          (assignmentFilter === 'READY' && ready))
      );
    });
  }, [assignmentFilter, courses, paymentFilter, programFilter, rows, search, statusFilter, teachers, yearFilter]);

  const metrics = useMemo(() => {
    const total = rows.length;
    const pendingPayment = rows.filter((row) => normalizePaymentStatus(row.enrollment.paymentStatus) === 'PENDING').length;
    const waitlist = rows.filter((row) => row.enrollment.status === 'WAITLIST').length;
    const assigned = rows.filter((row) => row.enrollment.status === 'ASSIGNED' && row.enrollment.classId).length;
    const activeCapacity = classes.filter((classItem) => !classItem.isArchived).reduce((sum, classItem) => sum + classItem.capacity, 0);
    const availableSeats = Math.max(activeCapacity - assigned, 0);

    return {
      total,
      pendingPayment,
      waitlist,
      assigned,
      availableSeats,
    };
  }, [classes, rows]);

  const applyEnrollmentUpdate = async (
    row: EnrollmentRow,
    updates: Partial<ProgramEnrollment>,
    options: { updateStudentPayment?: boolean; courseHistoryEntry?: CourseHistory | null } = {}
  ) => {
    setUpdatingId(row.enrollment.id);
    setMessage(null);

    try {
      const currentEnrollments = getStudentEnrollments(row.student);
      const updatedEnrollments = currentEnrollments.map((enrollment) => {
        if (enrollment.id !== row.enrollment.id) return enrollment;
        const nextEnrollment: ProgramEnrollment = {
          ...enrollment,
          ...updates,
        };

        if (Object.prototype.hasOwnProperty.call(updates, 'classId') && !updates.classId) {
          delete nextEnrollment.classId;
        }

        return nextEnrollment;
      });

      await updateStudent(row.student.id, {
        programEnrollments: updatedEnrollments,
        ...(options.updateStudentPayment
          ? { paymentStatus: deriveStudentPaymentStatus(updatedEnrollments) }
          : {}),
        ...(options.courseHistoryEntry
          ? { courseHistory: [...(row.student.courseHistory || []), options.courseHistoryEntry] }
          : {}),
      });

      return updatedEnrollments.find((enrollment) => enrollment.id === row.enrollment.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to update enrollment';
      setMessage({ type: 'error', text: errorMessage });
      throw error;
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePaymentChange = async (row: EnrollmentRow, paymentStatus: PaymentStatus) => {
    try {
      await applyEnrollmentUpdate(row, { paymentStatus }, { updateStudentPayment: true });
      setMessage({ type: 'success', text: `Payment marked ${formatLabel(paymentStatus)} for ${row.student.firstName}.` });
    } catch {
      // Message is set in applyEnrollmentUpdate.
    }
  };

  const handleStatusChange = async (row: EnrollmentRow, status: EnrollmentStatus) => {
    if (status === 'ASSIGNED' && !row.enrollment.classId) {
      setMessage({ type: 'error', text: 'Choose a class in the assignment column to assign this enrollment.' });
      return;
    }

    try {
      await applyEnrollmentUpdate(row, {
        status,
        classId: status === 'ASSIGNED' ? row.enrollment.classId : undefined,
      });
      setMessage({ type: 'success', text: `Enrollment status updated to ${formatLabel(status)}.` });
    } catch {
      // Message is set in applyEnrollmentUpdate.
    }
  };

  const sendEnrollmentEmail = async (studentId: string, classId: string) => {
    const response = await fetchWithAuth('/api/emails/send-enrollment', {
      method: 'POST',
      body: JSON.stringify({ studentId, classId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.warn('[EnrollmentManagement] Email notification failed:', data.error || response.statusText);
      return false;
    }

    return true;
  };

  const handleAssignClass = async (row: EnrollmentRow) => {
    const classId = selectedClasses[row.enrollment.id] || row.enrollment.classId || '';
    const classItem = classes.find((item) => item.id === classId);
    const paymentStatus = normalizePaymentStatus(row.enrollment.paymentStatus);

    if (!classId || !classItem) {
      setMessage({ type: 'error', text: 'Select a class before assigning this enrollment.' });
      return;
    }

    if (paymentStatus !== 'CONFIRMED') {
      setMessage({ type: 'error', text: 'Confirm payment before assigning a student to a class.' });
      return;
    }

    if (getAssignedCount(classId, row.enrollment.id) >= classItem.capacity) {
      setMessage({ type: 'error', text: 'That class is already full. Choose another class.' });
      return;
    }

    const duplicateAssignment = getStudentEnrollments(row.student).some(
      (enrollment) =>
        enrollment.id !== row.enrollment.id &&
        enrollment.programId === row.enrollment.programId &&
        enrollment.batchNumber === row.enrollment.batchNumber &&
        enrollment.classId &&
        enrollment.status === 'ASSIGNED'
    );

    if (duplicateAssignment) {
      setMessage({ type: 'error', text: 'This student is already assigned to another class for this program and batch.' });
      return;
    }

    try {
      const courseHistoryEntry = buildCourseHistoryEntry(row.student, classItem, row.program);
      await applyEnrollmentUpdate(
        row,
        {
          classId,
          status: 'ASSIGNED',
          batchNumber: classItem.batch,
        },
        { courseHistoryEntry }
      );

      const emailQueued = await sendEnrollmentEmail(row.student.id, classId);
      setMessage({
        type: 'success',
        text: `${row.student.firstName} ${row.student.lastName} assigned to ${classItem.name}.${emailQueued ? ' Notification email queued.' : ''}`,
      });
    } catch {
      // Message is set in applyEnrollmentUpdate.
    }
  };

  const clearFilters = () => {
    setSearch('');
    setProgramFilter('ALL');
    setYearFilter('ALL');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setAssignmentFilter('ALL');
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading enrollments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            message.type === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-rose-100 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Enrollments" value={metrics.total} helper="Across all programs" icon={FiClipboard} tone="bg-blue-50 text-blue-600" />
        <MetricCard label="Pending Payment" value={metrics.pendingPayment} helper="Needs confirmation" icon={FiCreditCard} tone="bg-amber-50 text-amber-600" />
        <MetricCard label="Waitlist" value={metrics.waitlist} helper="Not yet placed" icon={FiUsers} tone="bg-indigo-50 text-indigo-600" />
        <MetricCard label="Assigned" value={metrics.assigned} helper="Placed in classes" icon={FiUserCheck} tone="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Available Seats" value={metrics.availableSeats} helper="Open class capacity" icon={FiCheckCircle} tone="bg-sky-50 text-sky-600" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Enrollment Operations</h2>
              <p className="mt-1 text-sm text-slate-500">
                View enrollment state, confirm payments, and place students into the right class.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:w-80">
                <FiSearch className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search students, classes, guardians..."
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <FiFilter className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={programFilter}
              onChange={(event) => setProgramFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="ALL">All programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} {program.year}
                </option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="ALL">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | EnrollmentStatus)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="ALL">All statuses</option>
              {enrollmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as 'ALL' | PaymentStatus)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="ALL">All payments</option>
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
            <select
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value as AssignmentFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="ALL">All assignments</option>
              <option value="READY">Ready to assign</option>
              <option value="UNASSIGNED">Unassigned</option>
              <option value="ASSIGNED">Assigned</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1320px] w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Program</th>
                <th className="px-5 py-4">Payment</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Class Assignment</th>
                <th className="px-5 py-4">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const paymentStatus = normalizePaymentStatus(row.enrollment.paymentStatus);
                const availableClasses = getAvailableClasses(row);
                const selectedClassId = selectedClasses[row.enrollment.id] ?? row.enrollment.classId ?? '';
                const selectedClass = classes.find((classItem) => classItem.id === selectedClassId);
                const currentClass = row.classItem;
                const isUpdating = updatingId === row.enrollment.id;
                const teacher = currentClass?.teacherId ? teachers.find((item) => item.id === currentClass.teacherId) : undefined;
                const course = currentClass?.courseId ? courses.find((item) => item.id === currentClass.courseId) : undefined;
                const classIsFull = selectedClass ? getAssignedCount(selectedClass.id, row.enrollment.id) >= selectedClass.capacity : false;

                return (
                  <tr key={row.enrollment.id} className="align-top">
                    <td className="px-5 py-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <FiUsers className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-950">
                            {row.student.firstName} {row.student.lastName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{row.student.parentEmail || row.student.email || 'No email saved'}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">Enrolled {formatDate(row.enrollment.enrollmentDate)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <div className="max-w-xs">
                        <p className="font-bold text-slate-950">{row.program?.name || 'Unknown program'}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {row.program?.season ? formatLabel(row.program.season) : 'Season'} {row.program?.year || ''}
                          {' · '}Batch {row.enrollment.batchNumber}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {formatCurrency(row.enrollment.priceAmount)} · {formatLabel(row.enrollment.priceType || 'FULL_PRICE')}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <div className="space-y-2">
                        <Pill className={paymentStyles[paymentStatus]}>{formatLabel(paymentStatus)}</Pill>
                        <select
                          value={paymentStatus}
                          disabled={!canUpdate || isUpdating}
                          onChange={(event) => handlePaymentChange(row, event.target.value as PaymentStatus)}
                          className="block w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          {paymentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {formatLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <div className="space-y-2">
                        <Pill className={statusStyles[row.enrollment.status]}>{formatLabel(row.enrollment.status)}</Pill>
                        <select
                          value={row.enrollment.status}
                          disabled={!canUpdate || isUpdating}
                          onChange={(event) => handleStatusChange(row, event.target.value as EnrollmentStatus)}
                          className="block w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          {enrollmentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {formatLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <div className="space-y-3">
                        <div>
                          <p className="max-w-md font-bold text-slate-950">
                            {currentClass?.name || 'No class assigned'}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {course?.name || currentClass?.schedule || 'Choose a class'}{teacher ? ` · ${teacher.firstName} ${teacher.lastName}` : ''}
                          </p>
                        </div>
                        <div className="flex max-w-lg flex-col gap-2 sm:flex-row">
                          <select
                            value={selectedClassId}
                            disabled={!canUpdate || isUpdating}
                            onChange={(event) =>
                              setSelectedClasses((current) => ({
                                ...current,
                                [row.enrollment.id]: event.target.value,
                              }))
                            }
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            <option value="">Select class</option>
                            {availableClasses.map((classItem) => {
                              const count = getAssignedCount(classItem.id, row.enrollment.id);
                              return (
                                <option key={classItem.id} value={classItem.id}>
                                  {classItem.name} ({count}/{classItem.capacity})
                                </option>
                              );
                            })}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAssignClass(row)}
                            disabled={!canUpdate || isUpdating || !selectedClassId || classIsFull}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                          >
                            <FiSend className="h-4 w-4" />
                            {row.enrollment.classId ? 'Move' : 'Assign'}
                          </button>
                        </div>
                        {selectedClass && (
                          <p className={`text-xs font-semibold ${classIsFull ? 'text-rose-600' : 'text-slate-500'}`}>
                            {getAssignedCount(selectedClass.id, row.enrollment.id)} of {selectedClass.capacity} seats filled
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex flex-col gap-2">
                        {paymentStatus === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handlePaymentChange(row, 'CONFIRMED')}
                            disabled={!canUpdate || isUpdating}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiCheckCircle className="h-4 w-4" />
                            Confirm payment
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/?tab=students&id=${row.student.id}`)}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          View student
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <FiAlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-950">No enrollments found</h3>
            <p className="mt-2 text-sm text-slate-500">Try adjusting your filters or add enrollments from a student profile.</p>
          </div>
        )}
      </section>
    </div>
  );
}
