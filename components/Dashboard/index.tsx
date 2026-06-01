'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import {
  FiAlertCircle,
  FiArrowRight,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiGrid,
  FiLayers,
  FiMoreVertical,
  FiPlus,
  FiTrendingUp,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import { useStudents, useClasses, usePrograms, useTeachers, useProgramLevelSettings } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Modal } from '@/components/ui';
import { calculateAge } from '@/lib/utils';
import { getProgramLevelLabel } from '@/lib/program-levels';
import type { Class, Program, Student } from '@/types';
import { EnrollmentTrendsChartWrapper } from './EnrollmentTrendsChartWrapper';
import { YearOverYearComparison } from './YearOverYearComparison';
import { ProgramComparison } from './ProgramComparison';
import { ProgramHistoryComparison } from './ProgramHistoryComparison';
import { RevenueAnalytics } from './RevenueAnalytics';
import { RevenueForecast } from './RevenueForecast';
import { DiscountAdoptionAnalysis } from './DiscountAdoptionAnalysis';

type DashboardTarget = 'students' | 'courses' | 'programs' | 'classes' | 'teachers' | 'pricing';

interface DashboardProps {
  onSelectStudent?: (studentId: string) => void;
  onNavigate?: (target: DashboardTarget) => void;
}

type Accent = 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'orange';
type ClassStatus = 'Active' | 'Ready' | 'Full' | 'Pending';

const accentStyles: Record<Accent, { icon: string; line: string; soft: string }> = {
  blue: {
    icon: 'bg-blue-50 text-blue-600',
    line: 'stroke-blue-600',
    soft: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  green: {
    icon: 'bg-emerald-50 text-emerald-600',
    line: 'stroke-emerald-600',
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  yellow: {
    icon: 'bg-yellow-50 text-yellow-600',
    line: 'stroke-yellow-500',
    soft: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  },
  purple: {
    icon: 'bg-violet-50 text-violet-600',
    line: 'stroke-violet-600',
    soft: 'bg-violet-50 text-violet-700 border-violet-100',
  },
  red: {
    icon: 'bg-rose-50 text-rose-600',
    line: 'stroke-rose-500',
    soft: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  orange: {
    icon: 'bg-orange-50 text-orange-600',
    line: 'stroke-orange-500',
    soft: 'bg-orange-50 text-orange-700 border-orange-100',
  },
};

const statusStyles: Record<ClassStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Ready: 'bg-blue-50 text-blue-700 border-blue-100',
  Full: 'bg-rose-50 text-rose-700 border-rose-100',
  Pending: 'bg-amber-50 text-amber-700 border-amber-100',
};

function getEnrollments(student: Student) {
  return student.programEnrollments || student.enrollments || [];
}

function formatDate(value?: string) {
  if (!value) return 'Date pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date pending';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatProgramName(program?: Program) {
  if (!program) return 'Program pending';
  return `${program.name} ${program.year}`;
}

function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-sm font-bold text-slate-950 sm:text-base">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function MiniSparkline({ accent }: { accent: Accent }) {
  return (
    <svg viewBox="0 0 220 54" className="mt-4 h-10 w-full 2xl:mt-5 2xl:h-12" role="img" aria-label="Metric trend">
      <path
        d="M2 42 C26 40, 36 38, 52 39 C72 40, 76 28, 102 27 C124 26, 127 20, 151 25 C174 31, 178 20, 198 22 C209 22, 214 17, 218 12"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className={accentStyles[accent].line}
      />
    </svg>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  helper: string;
  accent: Accent;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md 2xl:p-5">
      <div className="flex items-start justify-between gap-3 2xl:gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full 2xl:h-14 2xl:w-14 ${accentStyles[accent].icon}`}>
          <Icon className="h-6 w-6 2xl:h-7 2xl:w-7" />
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-xs font-bold text-slate-400">
          i
        </span>
      </div>
      <div className="mt-4 min-w-0">
        <p className="text-xs font-semibold text-slate-500 2xl:text-sm">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-950 2xl:text-3xl">{value}</p>
        <p className="mt-3 text-xs leading-5 text-slate-600 2xl:text-sm">{helper}</p>
      </div>
      <MiniSparkline accent={accent} />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  helper,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  accent: Accent;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className={`rounded-xl border p-4 ${accentStyles[accent].soft}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500 2xl:text-xs">{label}</p>
          <p className="mt-2 text-xl font-bold text-slate-950 2xl:text-2xl">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <Icon className="h-7 w-7 shrink-0 opacity-30 2xl:h-8 2xl:w-8" />
      </div>
    </div>
  );
}

function UtilizationDonut({ value }: { value: number }) {
  const normalizedValue = Math.max(0, Math.min(value, 100));
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="relative flex aspect-square h-32 w-32 shrink-0 items-center justify-center 2xl:h-40 2xl:w-40">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="16"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#2563eb"
          strokeWidth="16"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-inner 2xl:h-28 2xl:w-28">
        <span className="text-2xl font-bold text-slate-950 2xl:text-3xl">{normalizedValue}%</span>
        <span className="text-xs text-slate-500 2xl:text-sm">Utilization</span>
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(value, 100));
  return (
    <div className="h-2 w-20 rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} />
    </div>
  );
}

function StatusBadge({ status }: { status: ClassStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function DashboardButton({
  icon: Icon,
  label,
  accent,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  accent: Accent;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-center text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-md 2xl:text-sm"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentStyles[accent].icon}`}>
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </button>
  );
}

export function Dashboard({ onSelectStudent, onNavigate }: DashboardProps) {
  const { students, isLoaded: studentsLoaded } = useStudents();
  const { classes, isLoaded: classesLoaded } = useClasses();
  const { programs } = usePrograms();
  const { teachers } = useTeachers();
  const { settings } = useProgramLevelSettings();
  const { user } = useAuth();
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [detailsModal, setDetailsModal] = useState<{ type: 'unassigned' | 'availability' | null; programFilter: string }>({
    type: null,
    programFilter: '',
  });
  const [analyticsViewMode, setAnalyticsViewMode] = useState<'program' | 'season' | 'year'>('program');
  const [analyticsYearFilter, setAnalyticsYearFilter] = useState<string>('all');

  const classesArray = Array.isArray(classes) ? classes : [];
  const activeClasses = classesArray.filter((classItem) => !classItem.isArchived);
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const classEnrollmentCount = useCallback(
    (classId: string) =>
      students.filter((student) =>
        getEnrollments(student).some((enrollment) => enrollment.classId === classId && enrollment.status === 'ASSIGNED')
      ).length,
    [students]
  );

  const getClassProgram = useCallback(
    (classItem: Class) => classItem.program || programs.find((program) => program.id === classItem.programId),
    [programs]
  );

  const getClassTeacherName = (classItem: Class) => {
    if (classItem.teacher) return `${classItem.teacher.firstName} ${classItem.teacher.lastName}`;
    const teacher = teachers.find((item) => item.id === classItem.teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned';
  };

  const getClassStatus = (classItem: Class): ClassStatus => {
    const enrolled = classEnrollmentCount(classItem.id);
    if (enrolled >= classItem.capacity) return 'Full';
    if (!classItem.teacherId || !classItem.meetLink) return 'Pending';
    if (enrolled > 0) return 'Active';
    return 'Ready';
  };

  const totalStudents = students.length;
  const totalClasses = activeClasses.length;
  const totalUniqueEnrolled = students.filter((student) =>
    getEnrollments(student).some((enrollment) => enrollment.classId && enrollment.status === 'ASSIGNED')
  ).length;
  const totalEnrollmentSlots = students.reduce(
    (sum, student) =>
      sum + getEnrollments(student).filter((enrollment) => enrollment.classId && enrollment.status === 'ASSIGNED').length,
    0
  );
  const totalCapacity = activeClasses.reduce((sum, classItem) => sum + classItem.capacity, 0);
  const totalAvailableSlots = Math.max(totalCapacity - totalEnrollmentSlots, 0);
  const capacityPercentage = totalCapacity > 0 ? Math.round((totalEnrollmentSlots / totalCapacity) * 100) : 0;

  const uniqueYears = useMemo(() => {
    const years = new Set(programs.map((program) => program.year));
    return Array.from(years).sort((a, b) => a - b);
  }, [programs]);

  const analyticsSummary = useMemo(() => {
    const filteredPrograms =
      analyticsViewMode === 'year'
        ? programs
        : analyticsYearFilter === 'all'
        ? programs
        : programs.filter((program) => program.year === parseInt(analyticsYearFilter, 10));

    const visiblePrograms =
      analyticsViewMode === 'season'
        ? filteredPrograms
        : analyticsViewMode === 'program'
        ? filteredPrograms
        : programs;

    const uniqueStudents = new Set<string>();
    let enrollmentSlots = 0;

    students.forEach((student) => {
      getEnrollments(student).forEach((enrollment) => {
        const program = programs.find((item) => item.id === enrollment.programId);
        const isVisibleProgram = visiblePrograms.some((item) => item.id === enrollment.programId);
        const isAssigned = enrollment.status === 'ASSIGNED';
        const isVisibleYear =
          analyticsViewMode !== 'year' ||
          analyticsYearFilter === 'all' ||
          program?.year === parseInt(analyticsYearFilter, 10);

        if (isAssigned && isVisibleProgram && isVisibleYear) {
          uniqueStudents.add(student.id);
          if (enrollment.classId) enrollmentSlots += 1;
        }
      });
    });

    const capacity = activeClasses
      .filter((classItem) => {
        const program = getClassProgram(classItem);
        if (analyticsYearFilter !== 'all' && program?.year !== parseInt(analyticsYearFilter, 10)) return false;
        if (analyticsViewMode === 'program' || analyticsViewMode === 'season') {
          return visiblePrograms.some((item) => item.id === classItem.programId);
        }
        return true;
      })
      .reduce((sum, classItem) => sum + classItem.capacity, 0);

    return {
      uniqueStudents: uniqueStudents.size,
      enrollmentSlots,
      capacity,
      utilization: capacity > 0 ? Math.round((enrollmentSlots / capacity) * 100) : 0,
    };
  }, [activeClasses, analyticsViewMode, analyticsYearFilter, getClassProgram, programs, students]);

  const programDistribution = useMemo(() => {
    const getFilteredStudents = (programLevelName: string) =>
      students.filter((student) =>
        activeClasses.some((classItem) => {
          if (classItem.programLevel !== programLevelName) return false;
          if (selectedProgram && classItem.programId !== selectedProgram) return false;

          return getEnrollments(student).some(
            (enrollment) => enrollment.classId === classItem.id && enrollment.status === 'ASSIGNED'
          );
        })
      ).length;

    return settings.reduce<Record<string, number>>((acc, setting) => {
      acc[setting.level] = getFilteredStudents(setting.level);
      return acc;
    }, {});
  }, [activeClasses, selectedProgram, settings, students]);

  const filteredStudentsCount = selectedProgram
    ? students.filter((student) =>
        getEnrollments(student).some((enrollment) => enrollment.programId === selectedProgram && enrollment.status === 'ASSIGNED')
      ).length
    : Object.values(programDistribution).reduce((sum, count) => sum + count, 0);

  const upcomingClasses = useMemo(
    () =>
      [...activeClasses]
        .sort((a, b) => {
          const programA = getClassProgram(a);
          const programB = getClassProgram(b);
          return new Date(programA?.startDate || a.createdAt).getTime() - new Date(programB?.startDate || b.createdAt).getTime();
        })
        .slice(0, 4),
    [activeClasses, getClassProgram]
  );

  const classOverview = activeClasses.slice(0, 6);
  const unassignedStudents = students.filter((student) =>
    getEnrollments(student).some((enrollment) => enrollment.status === 'ASSIGNED' && !enrollment.classId)
  );
  const closeToFullClasses = activeClasses.filter((classItem) => {
    const availableSlots = classItem.capacity - classEnrollmentCount(classItem.id);
    return availableSlots > 0 && availableSlots <= 2;
  });
  const recentRegistrations = [...students]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  if (!studentsLoaded || !classesLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))] gap-4 2xl:grid-cols-5">
        <MetricCard
          icon={FiUsers}
          label="Total Students"
          value={totalStudents}
          helper={`+${recentRegistrations.length} recent registrations`}
          accent="blue"
        />
        <MetricCard
          icon={FiBookOpen}
          label="Active Enrollments"
          value={totalUniqueEnrolled}
          helper={`${totalEnrollmentSlots} assigned class slots`}
          accent="green"
        />
        <MetricCard
          icon={FiCalendar}
          label="Total Classes"
          value={totalClasses}
          helper={`${activeClasses.filter((classItem) => getClassStatus(classItem) === 'Active').length} classes active`}
          accent="yellow"
        />
        <MetricCard
          icon={FiUserCheck}
          label="Available Slots"
          value={totalAvailableSlots}
          helper={`out of ${totalCapacity} total capacity`}
          accent="purple"
        />
        <MetricCard
          icon={FiBarChart2}
          label="Enrollment Rate"
          value={`${capacityPercentage}%`}
          helper={`${totalEnrollmentSlots} of ${totalCapacity} spots filled`}
          accent="red"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <SectionCard>
          <SectionHeader
            icon={FiBarChart2}
            title="Program & Year Analytics"
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={analyticsViewMode}
                  onChange={(event) => setAnalyticsViewMode(event.target.value as 'program' | 'season' | 'year')}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="program">By Program</option>
                  <option value="season">By Season</option>
                  <option value="year">By Year</option>
                </select>
                <select
                  value={analyticsYearFilter}
                  onChange={(event) => setAnalyticsYearFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="all">All Years</option>
                  {uniqueYears.map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
          <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] sm:p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SummaryTile
                label="Unique Students"
                value={analyticsSummary.uniqueStudents}
                helper="Across selected programs"
                accent="blue"
                icon={FiUsers}
              />
              <SummaryTile
                label="Enrollment Slots"
                value={analyticsSummary.enrollmentSlots}
                helper="Assigned across classes"
                accent="green"
                icon={FiLayers}
              />
              <SummaryTile
                label="Total Capacity"
                value={analyticsSummary.capacity}
                helper="Maximum class capacity"
                accent="yellow"
                icon={FiGrid}
              />
              <SummaryTile
                label="Utilization"
                value={`${analyticsSummary.utilization}%`}
                helper={`${analyticsSummary.enrollmentSlots}/${analyticsSummary.capacity} spots filled`}
                accent="red"
                icon={FiClock}
              />
            </div>
            <div className="flex flex-col items-center justify-center gap-5 rounded-2xl bg-slate-50 p-4 md:flex-row xl:flex-col 2xl:flex-row 2xl:gap-6 2xl:p-5">
              <UtilizationDonut value={analyticsSummary.utilization} />
              <div className="grid w-full grid-cols-1 gap-3 text-xs sm:grid-cols-3 md:w-auto md:grid-cols-1 2xl:text-sm">
                <p className="flex items-center gap-2 text-slate-600">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Filled Slots: {analyticsSummary.enrollmentSlots}
                </p>
                <p className="flex items-center gap-2 text-slate-600">
                  <span className="h-3 w-3 rounded-full bg-slate-300" />
                  Available: {Math.max(analyticsSummary.capacity - analyticsSummary.enrollmentSlots, 0)}
                </p>
                <p className="flex items-center gap-2 text-slate-600">
                  <span className="h-3 w-3 rounded-full bg-blue-600" />
                  Capacity: {analyticsSummary.capacity}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeader
            icon={FiCalendar}
            title="Upcoming Classes"
            action={
              <button
                type="button"
                onClick={() => onNavigate?.('classes')}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                View all
              </button>
            }
          />
          <div className="divide-y divide-slate-100 p-5 pt-0">
            {upcomingClasses.length > 0 ? (
              upcomingClasses.map((classItem) => {
                const program = getClassProgram(classItem);
                return (
                  <div key={classItem.id} className="flex gap-4 py-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <FiBookOpen className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950">{classItem.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatProgramName(program)}</p>
                        </div>
                        <StatusBadge status={getClassStatus(classItem)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <FiCalendar className="h-4 w-4" />
                          {formatDate(program?.startDate)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FiClock className="h-4 w-4" />
                          {classItem.slot || classItem.schedule}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No upcoming classes yet.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <SectionCard>
          <SectionHeader
            icon={FiUsers}
            title="Class Overview"
            action={
              <button
                type="button"
                onClick={() => onNavigate?.('classes')}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                View all classes
              </button>
            }
          />
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-3">Class Name</th>
                  <th className="px-3 py-3">Program</th>
                  <th className="px-3 py-3">Tutor</th>
                  <th className="px-3 py-3">Enrolled</th>
                  <th className="px-3 py-3">Capacity</th>
                  <th className="px-3 py-3">Utilization</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classOverview.length > 0 ? (
                  classOverview.map((classItem) => {
                    const enrolled = classEnrollmentCount(classItem.id);
                    const utilization = classItem.capacity > 0 ? Math.round((enrolled / classItem.capacity) * 100) : 0;
                    return (
                      <tr key={classItem.id} className="transition hover:bg-slate-50">
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <FiBookOpen className="h-5 w-5" />
                            </span>
                            <span className="font-bold text-slate-900">{classItem.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-slate-600">{formatProgramName(getClassProgram(classItem))}</td>
                        <td className="px-3 py-4 text-slate-600">{getClassTeacherName(classItem)}</td>
                        <td className="px-3 py-4 font-semibold text-slate-900">{enrolled}</td>
                        <td className="px-3 py-4 text-slate-600">{classItem.capacity}</td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-9 text-xs font-bold text-slate-600">{utilization}%</span>
                            <ProgressBar value={utilization} />
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <StatusBadge status={getClassStatus(classItem)} />
                        </td>
                        <td className="px-3 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigate?.('classes')}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                            aria-label={`Open ${classItem.name}`}
                          >
                            <FiMoreVertical className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={8}>
                      No classes have been created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeader icon={FiUserPlus} title="Quick Actions" />
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 2xl:grid-cols-2 2xl:p-5">
            <DashboardButton icon={FiUserPlus} label="Add Student" accent="blue" onClick={() => onNavigate?.('students')} />
            <DashboardButton icon={FiCalendar} label="Create Class" accent="green" onClick={() => onNavigate?.('classes')} />
            <DashboardButton icon={FiUsers} label="Assign Student" accent="purple" onClick={() => onNavigate?.('students')} />
            <DashboardButton icon={FiUserCheck} label="Add Tutor" accent="orange" onClick={() => onNavigate?.('teachers')} />
            <DashboardButton icon={FiLayers} label="Create Program" accent="red" onClick={() => onNavigate?.('programs')} />
            <DashboardButton icon={FiDollarSign} label="Update Pricing" accent="blue" onClick={() => onNavigate?.('pricing')} />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => setDetailsModal({ type: 'unassigned', programFilter: '' })}
          className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
              <FiUserCheck className="h-4 w-4" />
              Students Needing Assignment
            </p>
            <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">{unassignedStudents.length}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">Students not assigned to any class</p>
          <div className="mt-4 rounded-xl border border-emerald-100 bg-white p-3">
            {unassignedStudents[0] ? (
              <>
                <p className="font-bold text-slate-950">
                  {unassignedStudents[0].firstName} {unassignedStudents[0].lastName}
                </p>
                <p className="text-xs text-slate-500">{unassignedStudents[0].email || unassignedStudents[0].parentEmail || 'No email saved'}</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">All assigned for now.</p>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setDetailsModal({ type: 'availability', programFilter: '' })}
          className="rounded-2xl border border-yellow-100 bg-yellow-50/70 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-yellow-800">
              <FiAlertCircle className="h-4 w-4" />
              Classes Close to Full
            </p>
            <span className="rounded-lg bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-800">{closeToFullClasses.length}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">Classes with less than 2 slots left</p>
          <div className="mt-4 rounded-xl border border-yellow-100 bg-white p-3">
            {closeToFullClasses[0] ? (
              <>
                <p className="font-bold text-slate-950">{closeToFullClasses[0].name}</p>
                <p className="text-xs text-slate-500">
                  {closeToFullClasses[0].capacity - classEnrollmentCount(closeToFullClasses[0].id)} slots available
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No classes close to full capacity.</p>
            )}
          </div>
        </button>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-rose-800">
              <FiPlus className="h-4 w-4" />
              Recent Registrations
            </p>
            <span className="rounded-lg bg-rose-100 px-2 py-1 text-xs font-bold text-rose-800">{recentRegistrations.length}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">Latest student registrations</p>
          <div className="mt-4 space-y-2">
            {recentRegistrations.length > 0 ? (
              recentRegistrations.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => onSelectStudent?.(student.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-rose-100 bg-white p-3 text-left transition hover:border-rose-200"
                >
                  <div>
                    <p className="font-bold text-slate-950">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(student.createdAt)}</p>
                  </div>
                  <FiArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-rose-100 bg-white p-3 text-sm text-slate-500">No registrations yet.</div>
            )}
          </div>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="advanced-analytics space-y-6">
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Super Admin</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">Advanced Analytics</h2>
              <p className="mt-1 text-sm text-slate-500">
                Revenue, forecast, discount, and comparison analytics preserved from the previous dashboard.
              </p>
            </div>
          </div>

          <SectionCard>
            <SectionHeader
              icon={FiLayers}
              title="Program Distribution"
              action={
                <div className="flex items-center gap-2">
                  <select
                    value={selectedProgram}
                    onChange={(event) => setSelectedProgram(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">All Programs</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name} - {program.season} {program.year}
                      </option>
                    ))}
                  </select>
                  {selectedProgram && (
                    <button
                      type="button"
                      onClick={() => setSelectedProgram('')}
                      className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      Clear
                    </button>
                  )}
                </div>
              }
            />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(programDistribution).map(([programLevel, count], index) => {
                const accents: Accent[] = ['purple', 'blue', 'green'];
                const percent = filteredStudentsCount > 0 ? Math.round((count / filteredStudentsCount) * 100) : 0;

                return (
                  <SummaryTile
                    key={programLevel}
                    label={getProgramLevelLabel(settings, programLevel)}
                    value={count}
                    helper={`${percent}% of enrolled students`}
                    accent={accents[index] || 'blue'}
                    icon={FiUsers}
                  />
                );
              })}
              <SummaryTile
                label="Total Enrolled"
                value={filteredStudentsCount}
                helper={selectedProgram ? 'For selected program' : 'Across all programs'}
                accent="blue"
                icon={FiUserCheck}
              />
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeader icon={FiDollarSign} title="Revenue Analytics" />
            <div className="p-5">
              <RevenueAnalytics students={students} programs={programs} />
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeader icon={FiTrendingUp} title="Revenue Forecast" />
            <div className="p-5">
              <RevenueForecast students={students} programs={programs} classes={classesArray} />
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeader icon={FiBarChart2} title="Discount Adoption Analysis" />
            <div className="p-5">
              <DiscountAdoptionAnalysis students={students} programs={programs} />
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <SectionCard>
              <SectionHeader icon={FiBarChart2} title="Program Comparison" />
              <div className="p-5">
                <ProgramComparison students={students} programs={programs} classes={classesArray} />
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader icon={FiCalendar} title="Program History Comparison" />
              <div className="p-5">
                <ProgramHistoryComparison students={students} programs={programs} classes={classesArray} />
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader icon={FiTrendingUp} title="Year-over-Year Comparison" />
              <div className="p-5">
                <YearOverYearComparison students={students} programs={programs} classes={classesArray} />
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader icon={FiBarChart2} title="Enrollment Trends" />
              <div className="p-5">
                <EnrollmentTrendsChartWrapper students={students} programs={programs} />
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      <Modal
        isOpen={detailsModal.type === 'unassigned'}
        onClose={() => setDetailsModal({ type: null, programFilter: '' })}
        title="Unassigned Students"
      >
        <div className="space-y-4">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Filter by Program</label>
            <select
              value={detailsModal.programFilter}
              onChange={(event) => setDetailsModal({ ...detailsModal, programFilter: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} - {program.season} {program.year}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {students
              .filter((student) => {
                if (detailsModal.programFilter) {
                  return getEnrollments(student).some(
                    (enrollment) =>
                      enrollment.programId === detailsModal.programFilter &&
                      enrollment.status === 'ASSIGNED' &&
                      !enrollment.classId
                  );
                }

                return getEnrollments(student).some((enrollment) => enrollment.status === 'ASSIGNED' && !enrollment.classId);
              })
              .map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    setDetailsModal({ type: null, programFilter: '' });
                    onSelectStudent?.(student.id);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <p className="font-semibold text-slate-950">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{student.email || student.parentEmail || 'No email saved'}</p>
                  {student.dateOfBirth && <p className="mt-1 text-xs text-slate-500">Age: {calculateAge(student.dateOfBirth)}</p>}
                </button>
              ))}
            {students.filter((student) => {
              if (detailsModal.programFilter) {
                return getEnrollments(student).some(
                  (enrollment) =>
                    enrollment.programId === detailsModal.programFilter && enrollment.status === 'ASSIGNED' && !enrollment.classId
                );
              }

              return getEnrollments(student).some((enrollment) => enrollment.status === 'ASSIGNED' && !enrollment.classId);
            }).length === 0 && <p className="py-4 text-center text-slate-500">No unassigned students</p>}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={detailsModal.type === 'availability'}
        onClose={() => setDetailsModal({ type: null, programFilter: '' })}
        title="Classes with Available Spots"
      >
        <div className="space-y-4">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Filter by Program</label>
            <select
              value={detailsModal.programFilter}
              onChange={(event) => setDetailsModal({ ...detailsModal, programFilter: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} - {program.season} {program.year}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {activeClasses
              .filter((classItem) => {
                const enrolledCount = classEnrollmentCount(classItem.id);
                const hasAvailability = enrolledCount < classItem.capacity;

                if (!hasAvailability) return false;
                if (detailsModal.programFilter) {
                  return classItem.programId === detailsModal.programFilter;
                }
                return true;
              })
              .map((classItem) => {
                const enrolledCount = classEnrollmentCount(classItem.id);
                const availableSlots = classItem.capacity - enrolledCount;

                return (
                  <div key={classItem.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="font-semibold text-slate-950">{classItem.name}</p>
                    <p className="mt-1 text-xs text-slate-600">Level: {getProgramLevelLabel(settings, classItem.programLevel)}</p>
                    <p className="text-xs text-slate-600">Slot: {classItem.slot}</p>
                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      {availableSlots} spot{availableSlots !== 1 ? 's' : ''} available ({enrolledCount}/{classItem.capacity} enrolled)
                    </p>
                  </div>
                );
              })}
            {activeClasses.filter((classItem) => {
              const enrolledCount = classEnrollmentCount(classItem.id);
              const hasAvailability = enrolledCount < classItem.capacity;

              if (!hasAvailability) return false;
              if (detailsModal.programFilter) {
                return classItem.programId === detailsModal.programFilter;
              }
              return true;
            }).length === 0 && <p className="py-4 text-center text-slate-500">No classes with availability</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
