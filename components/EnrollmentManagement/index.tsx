'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiClipboard,
  FiCreditCard,
  FiFilter,
  FiLock,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiUnlock,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import { useClasses, useCourses, usePrograms, useStudents, useTeachers } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { normalizePaymentStatus } from '@/lib/student-payment-status';
import type { Class, CourseHistory, Program, ProgramEnrollment, Student, User } from '@/types';

type EnrollmentStatus = ProgramEnrollment['status'];
type PaymentStatus = Exclude<NonNullable<ProgramEnrollment['paymentStatus']>, 'COMPLETED'>;
type AssignmentFilter = 'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'READY';
type ViewMode = 'ALL' | 'WAITLIST';

type EnrollmentRow = {
  enrollment: ProgramEnrollment;
  student: Student;
  program?: Program;
  classItem?: Class;
};

type WaitlistEnrollment = ProgramEnrollment & {
  student: Student;
  program: Program;
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

function formatResendMessage(data: any) {
  const parentsSent = data.parentsSent ?? data.emailsSent?.parents ?? 0;
  const studentsSent = data.studentsSent ?? data.emailsSent?.students ?? 0;
  const parentsFailed = data.parentsFailed ?? data.emailsFailed?.parents ?? 0;
  const studentsFailed = data.studentsFailed ?? data.emailsFailed?.students ?? 0;
  const sentParts = [
    parentsSent ? `${parentsSent} parent${parentsSent === 1 ? '' : 's'}` : '',
    studentsSent ? `${studentsSent} student${studentsSent === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  const failedCount = parentsFailed + studentsFailed;

  if (data.success) {
    return sentParts.length ? `Assignment email resent to ${sentParts.join(' and ')}.` : 'Assignment email resend completed.';
  }

  return `${data.error || data.notification?.error || 'Assignment email resend did not complete.'}${failedCount ? ` Failed recipients: ${failedCount}.` : ''}`;
}

function getClaimState(enrollment: ProgramEnrollment, currentUserId?: string | null) {
  const isPersistentAssignment = Boolean(enrollment.claimedById && !enrollment.claimExpiresAt);
  const expiresAt = enrollment.claimExpiresAt ? new Date(enrollment.claimExpiresAt).getTime() : 0;
  const isActive = Boolean(enrollment.claimedById && (isPersistentAssignment || (expiresAt && expiresAt > Date.now())));

  if (!enrollment.claimedById || !isActive) {
    return {
      state: enrollment.claimedById ? 'EXPIRED' : 'UNCLAIMED',
      label: enrollment.claimedById ? 'Expired claim' : 'Unclaimed',
      className: enrollment.claimedById ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-emerald-100 bg-emerald-50 text-emerald-700',
      isActive: false,
      isMine: false,
      isOther: false,
      isPersistentAssignment: false,
    };
  }

  const isMine = enrollment.claimedById === currentUserId;
  const claimantName = enrollment.claimedBy
    ? `${enrollment.claimedBy.firstName} ${enrollment.claimedBy.lastName}`.trim()
    : 'another user';

  return {
    state: isMine ? 'MINE' : 'OTHER',
    label: isPersistentAssignment
      ? isMine
        ? 'Assigned to you'
        : `Assigned to ${claimantName}`
      : isMine
        ? 'Claimed by you'
        : `Claimed by ${claimantName}`,
    className: isMine ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-amber-100 bg-amber-50 text-amber-700',
    isActive: true,
    isMine,
    isOther: !isMine,
    isPersistentAssignment,
  };
}

function getGuardianContact(student: Student) {
  const primaryGuardian = student.family?.guardians?.find((guardian) => guardian.isPrimary) || student.family?.guardians?.[0];

  return {
    email: primaryGuardian?.email || student.parentEmail || student.email || 'No email saved',
    phone: primaryGuardian?.phone || student.parentPhone || student.phone || '',
    name: primaryGuardian ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}` : 'Guardian',
  };
}

export function EnrollmentManagement() {
  const router = useRouter();
  const { hasPermission, user } = useAuth();
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
  const [viewMode, setViewMode] = useState<ViewMode>('ALL');
  const [waitlistEnrollments, setWaitlistEnrollments] = useState<WaitlistEnrollment[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedWaitlistIds, setSelectedWaitlistIds] = useState<string[]>([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState('');
  const [bulkSelectCount, setBulkSelectCount] = useState(10);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    row: EnrollmentRow;
    currentClass?: Class;
    targetClass: Class;
  } | null>(null);

  const canUpdate = hasPermission(PERMISSIONS.UPDATE_ENROLLMENT);
  const canResendEmail = hasPermission(PERMISSIONS.RESEND_EMAIL);
  const canManageWaitlist = hasPermission(PERMISSIONS.MANAGE_WAITLIST);
  const canOverrideClaims = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const canBulkAssignWaitlist = canOverrideClaims;
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

  const fetchWaitlistQueue = useCallback(async () => {
    setWaitlistLoading(true);
    setWaitlistError(null);

    try {
      const params = new URLSearchParams();
      if (programFilter !== 'ALL') params.set('programId', programFilter);
      if (yearFilter !== 'ALL') params.set('year', yearFilter);

      const response = await fetchWithAuth(`/api/enrollments/waitlist${params.toString() ? `?${params.toString()}` : ''}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load waitlist queue');
      }

      setWaitlistEnrollments(data.enrollments || []);
    } catch (error) {
      setWaitlistError(error instanceof Error ? error.message : 'Failed to load waitlist queue');
    } finally {
      setWaitlistLoading(false);
    }
  }, [programFilter, yearFilter]);

  useEffect(() => {
    if (viewMode !== 'WAITLIST') return;

    void fetchWaitlistQueue();
    const intervalId = window.setInterval(() => {
      void fetchWaitlistQueue();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [fetchWaitlistQueue, viewMode]);

  useEffect(() => {
    if (viewMode !== 'WAITLIST' || !canBulkAssignWaitlist) return;

    const fetchUsers = async () => {
      try {
        const response = await fetchWithAuth('/api/users');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load staff users');
        }

        setUsers(Array.isArray(data) ? data.filter((item: User) => item.isActive) : []);
      } catch (error) {
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load staff users' });
      }
    };

    void fetchUsers();
  }, [canBulkAssignWaitlist, viewMode]);

  const waitlistRows = useMemo<EnrollmentRow[]>(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return waitlistEnrollments
      .filter((enrollment) => {
        const guardian = getGuardianContact(enrollment.student);
        const paymentStatus = normalizePaymentStatus(enrollment.paymentStatus);
        const haystack = [
          enrollment.student.firstName,
          enrollment.student.lastName,
          enrollment.student.email,
          enrollment.student.parentEmail,
          enrollment.student.parentPhone,
          guardian.name,
          guardian.email,
          guardian.phone,
          enrollment.program.name,
          enrollment.program.season,
          `batch ${enrollment.batchNumber}`,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return (
          (!normalizedSearch || haystack.includes(normalizedSearch)) &&
          (paymentFilter === 'ALL' || paymentStatus === paymentFilter)
        );
      })
      .map((enrollment) => ({
        enrollment,
        student: {
          ...enrollment.student,
          programEnrollments: enrollment.student.programEnrollments || enrollment.student.enrollments || [enrollment],
        },
        program: enrollment.program,
        classItem: undefined,
      }));
  }, [paymentFilter, search, waitlistEnrollments]);

  const waitlistGroups = useMemo(() => {
    const groups = new Map<string, { key: string; title: string; program?: Program; batchNumber: number; rows: EnrollmentRow[] }>();

    for (const row of waitlistRows) {
      const key = `${row.enrollment.programId}-${row.enrollment.batchNumber}`;
      const title = `${row.program?.name || 'Unknown program'} ${row.program?.year || ''} · Batch ${row.enrollment.batchNumber}`;
      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.rows.push(row);
      } else {
        groups.set(key, {
          key,
          title,
          program: row.program,
          batchNumber: row.enrollment.batchNumber,
          rows: [row],
        });
      }
    }

    return Array.from(groups.values());
  }, [waitlistRows]);

  useEffect(() => {
    const visibleIds = new Set(waitlistRows.map((row) => row.enrollment.id));
    setSelectedWaitlistIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [waitlistRows]);

  const toggleWaitlistSelection = (enrollmentId: string) => {
    setSelectedWaitlistIds((current) =>
      current.includes(enrollmentId)
        ? current.filter((id) => id !== enrollmentId)
        : [...current, enrollmentId]
    );
  };

  const selectFirstVisibleWaitlistRows = () => {
    const count = Math.max(1, bulkSelectCount || 1);
    setSelectedWaitlistIds(waitlistRows.slice(0, count).map((row) => row.enrollment.id));
  };

  const clearWaitlistSelection = () => {
    setSelectedWaitlistIds([]);
  };

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

  const claimEnrollment = async (row: EnrollmentRow, options: { quiet?: boolean } = {}) => {
    setClaimingId(row.enrollment.id);
    if (!options.quiet) setMessage(null);

    try {
      const response = await fetchWithAuth(`/api/enrollments/${row.enrollment.id}/claim`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim waitlist item');
      }

      await fetchWaitlistQueue();
      if (!options.quiet) {
        setMessage({ type: 'success', text: `${row.student.firstName} ${row.student.lastName} is now claimed by you for assignment.` });
      }
      return data.enrollment as ProgramEnrollment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim waitlist item';
      setMessage({ type: 'error', text: errorMessage });
      throw error;
    } finally {
      setClaimingId(null);
    }
  };

  const releaseEnrollmentClaim = async (row: EnrollmentRow) => {
    setClaimingId(row.enrollment.id);
    setMessage(null);

    try {
      const response = await fetchWithAuth(`/api/enrollments/${row.enrollment.id}/claim`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to release waitlist claim');
      }

      await fetchWaitlistQueue();
      setMessage({ type: 'success', text: `Claim released for ${row.student.firstName} ${row.student.lastName}.` });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to release waitlist claim' });
    } finally {
      setClaimingId(null);
    }
  };

  const handleBulkAssignToStaff = async () => {
    if (!bulkAssigneeId) {
      setMessage({ type: 'error', text: 'Choose a staff member before assigning waitlist items.' });
      return;
    }

    if (selectedWaitlistIds.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one waitlisted student.' });
      return;
    }

    setBulkAssigning(true);
    setMessage(null);

    try {
      const response = await fetchWithAuth('/api/enrollments/claims', {
        method: 'POST',
        body: JSON.stringify({
          enrollmentIds: selectedWaitlistIds,
          claimedById: bulkAssigneeId,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign waitlist items to staff');
      }

      await fetchWaitlistQueue();
      clearWaitlistSelection();
      const assigneeName = data.assignee ? `${data.assignee.firstName} ${data.assignee.lastName}` : 'selected staff';
      setMessage({
        type: 'success',
        text: `${data.assignedCount} waitlist item${data.assignedCount === 1 ? '' : 's'} assigned to ${assigneeName}.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to assign waitlist items to staff' });
    } finally {
      setBulkAssigning(false);
    }
  };

  const ensureWaitlistClaimForAssignment = async (row: EnrollmentRow) => {
    if (row.enrollment.status !== 'WAITLIST') return;

    const claim = getClaimState(row.enrollment, user?.id);

    if (claim.isOther && !canOverrideClaims) {
      throw new Error(claim.label);
    }

    if (!claim.isMine) {
      await claimEnrollment(row, { quiet: true });
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

  const executeClassAssignment = async (row: EnrollmentRow, classItem: Class) => {
    try {
      await ensureWaitlistClaimForAssignment(row);
      const courseHistoryEntry = buildCourseHistoryEntry(row.student, classItem, row.program);
      await applyEnrollmentUpdate(
        row,
        {
          classId: classItem.id,
          status: 'ASSIGNED',
          batchNumber: classItem.batch,
        },
        { courseHistoryEntry }
      );

      setMessage({
        type: 'success',
        text: `${row.student.firstName} ${row.student.lastName} assigned to ${classItem.name}. Parent notification email is handled by the server.`,
      });
      if (viewMode === 'WAITLIST') {
        await fetchWaitlistQueue();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to assign student to class' });
    }
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

    if (row.enrollment.classId === classId) {
      setMessage({ type: 'error', text: 'This student is already assigned to that class.' });
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

    if (row.enrollment.classId && row.enrollment.classId !== classId) {
      setPendingMove({
        row,
        currentClass: row.classItem || classes.find((item) => item.id === row.enrollment.classId),
        targetClass: classItem,
      });
      return;
    }

    await executeClassAssignment(row, classItem);
  };

  const confirmMoveClass = async () => {
    if (!pendingMove) return;
    const { row, targetClass } = pendingMove;
    setPendingMove(null);
    await executeClassAssignment(row, targetClass);
  };

  const handleResendAssignmentEmail = async (row: EnrollmentRow) => {
    if (!row.enrollment.classId) {
      setMessage({ type: 'error', text: 'This enrollment does not have an assigned class.' });
      return;
    }

    setResendingId(row.enrollment.id);
    setMessage(null);

    try {
      const response = await fetchWithAuth('/api/emails/send-enrollment', {
        method: 'POST',
        body: JSON.stringify({
          studentId: row.student.id,
          classId: row.enrollment.classId,
          enrollmentId: row.enrollment.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend assignment email');
      }

      setMessage({
        type: data.success ? 'success' : 'error',
        text: formatResendMessage(data),
      });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to resend assignment email' });
    } finally {
      setResendingId(null);
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
      {pendingMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <FiAlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Confirm class move</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    You are about to move {pendingMove.row.student.firstName} {pendingMove.row.student.lastName} to a different class.
                    This will update their enrollment and send the class assignment email for the new class.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Current class</p>
                <p className="mt-1 font-bold text-slate-950">{pendingMove.currentClass?.name || 'No class assigned'}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-500">New class</p>
                <p className="mt-1 font-bold text-slate-950">{pendingMove.targetClass.name}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingMove(null)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMoveClass}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Confirm move
              </button>
            </div>
          </div>
        </div>
      )}

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

          <div className="mt-4 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('ALL')}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                viewMode === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              All Enrollments
            </button>
            <button
              type="button"
              onClick={() => setViewMode('WAITLIST')}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                viewMode === 'WAITLIST'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              Waitlist Queue
            </button>
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

        {viewMode === 'WAITLIST' ? (
          <div className="space-y-4 p-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <FiLock className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">Claim before assigning</p>
                  <p className="mt-1 text-blue-700">
                    Self-claims last 20 minutes. Admin-assigned staff work does not expire, and admins can override it.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fetchWaitlistQueue()}
                disabled={waitlistLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiRefreshCw className={`h-4 w-4 ${waitlistLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {canBulkAssignWaitlist && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-950">Assign waitlist work to staff</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Select individual students or select the first visible rows, then assign them to a staff member.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[140px_auto_auto] xl:min-w-[620px]">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">First rows</label>
                      <input
                        type="number"
                        min={1}
                        value={bulkSelectCount}
                        onChange={(event) => setBulkSelectCount(Number(event.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={selectFirstVisibleWaitlistRows}
                      disabled={waitlistRows.length === 0}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
                    >
                      Select first {Math.max(1, bulkSelectCount || 1)}
                    </button>
                    <button
                      type="button"
                      onClick={clearWaitlistSelection}
                      disabled={selectedWaitlistIds.length === 0}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <select
                    value={bulkAssigneeId}
                    onChange={(event) => setBulkAssigneeId(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option value="">Choose staff member</option>
                    {users.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.firstName} {item.lastName} · {formatLabel(item.role)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleBulkAssignToStaff}
                    disabled={bulkAssigning || selectedWaitlistIds.length === 0 || !bulkAssigneeId}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    <FiUserPlus className="h-4 w-4" />
                    {bulkAssigning ? 'Assigning...' : `Assign selected (${selectedWaitlistIds.length})`}
                  </button>
                </div>
              </div>
            )}

            {waitlistError && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {waitlistError}
              </div>
            )}

            {waitlistGroups.map((group) => {
              const groupClasses = classes
                .filter((classItem) => !classItem.isArchived && classItem.programId === group.program?.id && classItem.batch === group.batchNumber)
                .sort((a, b) => a.name.localeCompare(b.name));
              const openSeats = groupClasses.reduce((sum, classItem) => {
                return sum + Math.max(classItem.capacity - getAssignedCount(classItem.id), 0);
              }, 0);

              return (
                <div key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{group.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {group.rows.length} waitlisted student{group.rows.length === 1 ? '' : 's'} · {openSeats} open seat{openSeats === 1 ? '' : 's'} across {groupClasses.length} class{groupClasses.length === 1 ? '' : 'es'}
                      </p>
                    </div>
                    <Pill className="border-indigo-100 bg-indigo-50 text-indigo-700">
                      {group.program?.season ? formatLabel(group.program.season) : 'Program'} {group.program?.year || ''}
                    </Pill>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.rows.map((row) => {
                      const guardian = getGuardianContact(row.student);
                      const paymentStatus = normalizePaymentStatus(row.enrollment.paymentStatus);
                      const claim = getClaimState(row.enrollment, user?.id);
                      const selectedClassId = selectedClasses[row.enrollment.id] || '';
                      const selectedClass = classes.find((classItem) => classItem.id === selectedClassId);
                      const classIsFull = selectedClass ? getAssignedCount(selectedClass.id, row.enrollment.id) >= selectedClass.capacity : false;
                      const canAssignClaim = !claim.isOther || canOverrideClaims;
                      const showRelease = (claim.isMine && !claim.isPersistentAssignment) || (claim.isActive && canOverrideClaims);
                      const isClaiming = claimingId === row.enrollment.id;
                      const isUpdating = updatingId === row.enrollment.id;

                      return (
                        <div key={row.enrollment.id} className="grid gap-4 p-5 xl:grid-cols-[1.35fr_1fr_1.45fr_auto] xl:items-center">
                          <div className="min-w-0">
                            <div className="flex items-start gap-3">
                              {canBulkAssignWaitlist && (
                                <input
                                  type="checkbox"
                                  checked={selectedWaitlistIds.includes(row.enrollment.id)}
                                  onChange={() => toggleWaitlistSelection(row.enrollment.id)}
                                  className="mt-3 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  aria-label={`Select ${row.student.firstName} ${row.student.lastName}`}
                                />
                              )}
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <FiUsers className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-950">
                                  {row.student.firstName} {row.student.lastName}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">{guardian.email}</p>
                                {guardian.phone && <p className="mt-1 text-xs font-semibold text-slate-400">{guardian.phone}</p>}
                                <p className="mt-1 text-xs font-semibold text-slate-400">Waitlisted {formatDate(row.enrollment.enrollmentDate)}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Pill className={paymentStyles[paymentStatus]}>{formatLabel(paymentStatus)}</Pill>
                            <Pill className={claim.className}>{claim.label}</Pill>
                            {row.enrollment.claimExpiresAt && claim.isActive && (
                              <p className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                                <FiClock className="h-3.5 w-3.5" />
                                Until {new Date(row.enrollment.claimExpiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            )}
                            {claim.isPersistentAssignment && claim.isActive && (
                              <p className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                                <FiUserCheck className="h-3.5 w-3.5" />
                                Admin-assigned work
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <select
                                value={selectedClassId}
                                disabled={!canUpdate || !canAssignClaim || isUpdating}
                                onChange={(event) =>
                                  setSelectedClasses((current) => ({
                                    ...current,
                                    [row.enrollment.id]: event.target.value,
                                  }))
                                }
                                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                              >
                                <option value="">Select class</option>
                                {groupClasses.map((classItem) => {
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
                                disabled={!canUpdate || isUpdating || paymentStatus !== 'CONFIRMED' || !selectedClassId || classIsFull || !canAssignClaim}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                              >
                                <FiSend className="h-4 w-4" />
                                Assign
                              </button>
                            </div>
                            {selectedClass && (
                              <p className={`text-xs font-semibold ${classIsFull ? 'text-rose-600' : 'text-slate-500'}`}>
                                {getAssignedCount(selectedClass.id, row.enrollment.id)} of {selectedClass.capacity} seats filled
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 xl:justify-end">
                            <button
                              type="button"
                              onClick={() => claimEnrollment(row)}
                              disabled={!canManageWaitlist || isClaiming || (claim.isActive && claim.isMine) || (claim.isOther && !canOverrideClaims)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FiLock className="h-4 w-4" />
                              {claim.isOther && canOverrideClaims
                                ? 'Override'
                                : claim.isMine && claim.isPersistentAssignment
                                  ? 'Assigned'
                                  : claim.isMine
                                    ? 'Claimed'
                                    : 'Claim'}
                            </button>
                            {showRelease && (
                              <button
                                type="button"
                                onClick={() => releaseEnrollmentClaim(row)}
                                disabled={!canManageWaitlist || isClaiming}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FiUnlock className="h-4 w-4" />
                                Release
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {!waitlistLoading && waitlistGroups.length === 0 && (
              <div className="p-10 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                  <FiCheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-950">No waitlisted students found</h3>
                <p className="mt-2 text-sm text-slate-500">Try adjusting filters, or check All Enrollments for assigned and completed students.</p>
              </div>
            )}
          </div>
        ) : (
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
                const isResending = resendingId === row.enrollment.id;
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
                        {canResendEmail && row.enrollment.status === 'ASSIGNED' && row.enrollment.classId && (
                          <button
                            type="button"
                            onClick={() => handleResendAssignmentEmail(row)}
                            disabled={isResending}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiSend className="h-4 w-4" />
                            {isResending ? 'Resending...' : 'Resend assignment email'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        {viewMode === 'ALL' && filteredRows.length === 0 && (
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
