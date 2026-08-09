'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import type { ComponentType } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FiAlertTriangle,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiCreditCard,
  FiDollarSign,
  FiEdit3,
  FiGrid,
  FiHome,
  FiLayers,
  FiLink,
  FiLogOut,
  FiMail,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiTarget,
  FiUser,
  FiUserCheck,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import type { Class, ConfirmedRegistrationImport, Course, EmailLog, Family, Student, UserInvitation } from '@/types';
import { Dashboard } from '@/components/Dashboard';
import { StudentManagement } from '@/components/StudentManagement';
import { ClassManagement } from '@/components/ClassManagement';
import { CoursesManagement } from '@/components/CoursesManagement';
import { ProgramsManagement } from '@/components/ProgramsManagement';
import { ProgramLevelsManagement } from '@/components/ProgramLevelsManagement';
import { TeachersManagement } from '@/components/TeachersManagement';
import { UserManagement } from '@/components/UserManagement';
import { PricingPage } from '@/components/PricingManagement';
import { FamiliesManagement } from '@/components/FamiliesManagement';
import { EnrollmentManagement } from '@/components/EnrollmentManagement';
import { EmailLogsManagement } from '@/components/EmailLogsManagement';
import { EmailTemplatesManagement } from '@/components/EmailTemplatesManagement';
import { ConfirmedRegistrationsManagement } from '@/components/ConfirmedRegistrationsManagement';

type Tab =
  | 'dashboard'
  | 'students'
  | 'families'
  | 'confirmed-registrations'
  | 'enrollments'
  | 'courses'
  | 'program-levels'
  | 'programs'
  | 'classes'
  | 'teachers'
  | 'pricing'
  | 'email-templates'
  | 'emails'
  | 'users'
  | 'reports'
  | 'settings';

type NavItem = {
  id: Tab;
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
};

type OperationalAlert = {
  id: string;
  title: string;
  detail: string;
  count: number;
  tab: Tab;
  priority: 'high' | 'medium' | 'low';
  icon: ComponentType<{ className?: string }>;
};

type GlobalSearchResult = {
  id: string;
  type: 'student' | 'class' | 'course';
  label: string;
  detail: string;
};

const pageMeta: Record<Tab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your academy' },
  students: { title: 'Students', subtitle: 'Manage learners and parent records' },
  families: { title: 'Families', subtitle: 'Manage households, guardians, and sibling groups' },
  'confirmed-registrations': { title: 'Confirmed Registrations', subtitle: 'Import paid customers and re-enroll existing families' },
  enrollments: { title: 'Enrollments', subtitle: 'Track student enrollment activity' },
  courses: { title: 'Courses', subtitle: 'Manage course catalog' },
  'program-levels': { title: 'Program Levels', subtitle: 'Manage level availability across courses' },
  programs: { title: 'Programs', subtitle: 'Organize seasons, batches, and cohorts' },
  classes: { title: 'Classes', subtitle: 'Manage sessions, tutors, and meeting links' },
  teachers: { title: 'Tutors', subtitle: 'Manage tutors and assignments' },
  pricing: { title: 'Pricing', subtitle: 'Maintain tuition and discount options' },
  'email-templates': { title: 'Email Templates', subtitle: 'Manage course assignment emails' },
  emails: { title: 'Email Logs', subtitle: 'Track failed, sent, and retried notifications' },
  users: { title: 'Users', subtitle: 'Manage admin access and permissions' },
  reports: { title: 'Reports', subtitle: 'Review academy performance summaries' },
  settings: { title: 'Settings', subtitle: 'Configure academy management preferences' },
};

function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FiLayers className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </section>
  );
}

function buildOperationalAlerts({
  students,
  classes,
  families,
  invitations,
  emailLogs,
  confirmedImports,
  canReadUsers,
  canReadEmailLogs,
  canReadConfirmedRegistrations,
}: {
  students: Student[];
  classes: Class[];
  families: Family[];
  invitations: UserInvitation[];
  emailLogs: EmailLog[];
  confirmedImports: ConfirmedRegistrationImport[];
  canReadUsers: boolean;
  canReadEmailLogs: boolean;
  canReadConfirmedRegistrations: boolean;
}): OperationalAlert[] {
  const activeClasses = classes.filter((classItem) => !classItem.isArchived);
  const activeEnrollments = students.flatMap((student) =>
    (student.programEnrollments || student.enrollments || []).map((enrollment) => ({
      ...enrollment,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
    }))
  );

  const assignmentCount = activeEnrollments.filter(
    (enrollment) => enrollment.status !== 'COMPLETED' && enrollment.status !== 'DROPPED' && !enrollment.classId
  ).length;

  const pendingPaymentCount = activeEnrollments.filter(
    (enrollment) => enrollment.status !== 'DROPPED' && enrollment.paymentStatus === 'PENDING'
  ).length;

  const classEnrollmentCount = (classId: string) =>
    activeEnrollments.filter((enrollment) => enrollment.classId === classId && enrollment.status === 'ASSIGNED').length;

  const closeToFullCount = activeClasses.filter((classItem) => {
    const filled = classEnrollmentCount(classItem.id);
    const remaining = classItem.capacity - filled;
    return classItem.capacity > 0 && remaining > 0 && remaining <= 2;
  }).length;

  const missingMeetLinkCount = activeClasses.filter((classItem) => !classItem.meetLink).length;
  const missingTutorCount = activeClasses.filter((classItem) => !classItem.teacherId).length;
  const needsReviewCount = families.filter((family) =>
    family.guardians?.some((guardian) => guardian.needsReview)
  ).length;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentRegistrationCount = students.filter((student) => {
    const createdAt = student.createdAt ? new Date(student.createdAt).getTime() : 0;
    return createdAt >= sevenDaysAgo;
  }).length;

  const alerts: OperationalAlert[] = [
    {
      id: 'students-needing-assignment',
      title: 'Students needing assignment',
      detail: `${assignmentCount} enrollment${assignmentCount === 1 ? '' : 's'} waiting for a class`,
      count: assignmentCount,
      tab: 'enrollments',
      priority: 'high',
      icon: FiClipboard,
    },
    {
      id: 'pending-payments',
      title: 'Pending payments',
      detail: `${pendingPaymentCount} enrollment${pendingPaymentCount === 1 ? '' : 's'} still pending payment`,
      count: pendingPaymentCount,
      tab: 'enrollments',
      priority: 'high',
      icon: FiCreditCard,
    },
    {
      id: 'missing-meet-links',
      title: 'Classes missing Meet links',
      detail: `${missingMeetLinkCount} active class${missingMeetLinkCount === 1 ? '' : 'es'} need meeting links`,
      count: missingMeetLinkCount,
      tab: 'classes',
      priority: 'medium',
      icon: FiLink,
    },
    {
      id: 'missing-tutors',
      title: 'Classes without tutors',
      detail: `${missingTutorCount} active class${missingTutorCount === 1 ? '' : 'es'} need tutor assignment`,
      count: missingTutorCount,
      tab: 'classes',
      priority: 'medium',
      icon: FiUserCheck,
    },
    {
      id: 'classes-close-to-full',
      title: 'Classes close to full',
      detail: `${closeToFullCount} class${closeToFullCount === 1 ? ' has' : 'es have'} two or fewer seats left`,
      count: closeToFullCount,
      tab: 'classes',
      priority: 'medium',
      icon: FiAlertTriangle,
    },
    {
      id: 'families-needing-review',
      title: 'Family records need review',
      detail: `${needsReviewCount} famil${needsReviewCount === 1 ? 'y has' : 'ies have'} guardian details to review`,
      count: needsReviewCount,
      tab: 'families',
      priority: 'low',
      icon: FiUsers,
    },
    {
      id: 'recent-registrations',
      title: 'Recent registrations',
      detail: `${recentRegistrationCount} student${recentRegistrationCount === 1 ? '' : 's'} added in the last 7 days`,
      count: recentRegistrationCount,
      tab: 'students',
      priority: 'low',
      icon: FiUser,
    },
  ];

  if (canReadUsers) {
    const pendingInviteCount = invitations.filter((invitation) => invitation.status === 'PENDING').length;
    alerts.push({
      id: 'pending-invitations',
      title: 'Pending invitations',
      detail: `${pendingInviteCount} team invite${pendingInviteCount === 1 ? '' : 's'} not accepted yet`,
      count: pendingInviteCount,
      tab: 'users',
      priority: 'low',
      icon: FiMail,
    });
  }

  if (canReadEmailLogs) {
    const failedEmailCount = emailLogs.filter((log) => log.status === 'FAILED' || log.status === 'BOUNCED').length;
    alerts.unshift({
      id: 'failed-emails',
      title: 'Failed emails',
      detail: `${failedEmailCount} email${failedEmailCount === 1 ? '' : 's'} need review or resend`,
      count: failedEmailCount,
      tab: 'emails',
      priority: 'high',
      icon: FiMail,
    });
  }

  if (canReadConfirmedRegistrations) {
    const failedCrmImportCount = confirmedImports.filter((item) => item.crmSyncStatus === 'FAILED').length;
    alerts.unshift({
      id: 'failed-crm-sync',
      title: 'FluentCRM sync failures',
      detail: `${failedCrmImportCount} paid import${failedCrmImportCount === 1 ? '' : 's'} need CRM sync retry`,
      count: failedCrmImportCount,
      tab: 'confirmed-registrations',
      priority: 'high',
      icon: FiRefreshCw,
    });
  }

  const priorityRank = { high: 0, medium: 1, low: 2 };
  return alerts
    .filter((alert) => alert.count > 0)
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.count - a.count);
}

function OperationalAlertsBell({
  alerts,
  isLoading,
  onNavigate,
}: {
  alerts: OperationalAlert[];
  isLoading: boolean;
  onNavigate: (tab: Tab) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const totalCount = alerts.reduce((sum, alert) => sum + alert.count, 0);
  const visibleAlerts = alerts.slice(0, 5);

  const priorityStyles: Record<OperationalAlert['priority'], string> = {
    high: 'bg-rose-50 text-rose-600',
    medium: 'bg-amber-50 text-amber-600',
    low: 'bg-blue-50 text-blue-600',
  };

  const handleNavigate = (tab: Tab) => {
    setIsOpen(false);
    onNavigate(tab);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="relative rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <FiBell className="h-5 w-5" />
        {totalCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-[min(92vw,26rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-950">Operational alerts</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {totalCount > 0 ? `${totalCount} item${totalCount === 1 ? '' : 's'} need attention` : 'Everything looks clear'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close notifications"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[24rem] overflow-y-auto p-2">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm font-medium text-slate-500">
                Checking academy operations...
              </div>
            ) : visibleAlerts.length > 0 ? (
              <div className="space-y-1">
                {visibleAlerts.map((alert) => {
                  const Icon = alert.icon;

                  return (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => handleNavigate(alert.tab)}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${priorityStyles[alert.priority]}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-950">{alert.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{alert.detail}</span>
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {alert.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <FiCheckCircle className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-slate-950">No active alerts</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Payments, classes, assignments, and invites look clear.</p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={() => handleNavigate('dashboard')}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              View dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [areAlertsLoading, setAreAlertsLoading] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState('');
  const [searchCatalog, setSearchCatalog] = useState<{
    students: Student[];
    classes: Class[];
    courses: Course[];
  }>({ students: [], classes: [], courses: [] });
  const [directorySearch, setDirectorySearch] = useState<{
    tab: 'classes' | 'courses';
    query: string;
    requestId: number;
  } | null>(null);
  const hasLoadedAlertsRef = useRef(false);
  const hasLoadedGlobalSearchRef = useRef(false);
  const globalSearchRef = useRef<HTMLDivElement>(null);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);
  const canReadUsers = hasPermission(PERMISSIONS.READ_USERS);
  const canReadEmailLogs = hasPermission(PERMISSIONS.READ_EMAIL_LOGS);
  const canReadEmailTemplates = hasPermission(PERMISSIONS.READ_EMAIL_TEMPLATES);
  const canReadConfirmedRegistrations = hasPermission(PERMISSIONS.READ_CONFIRMED_REGISTRATIONS);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { id: 'students', label: 'Students', icon: FiUsers },
  { id: 'families', label: 'Families', icon: FiHome },
    { id: 'confirmed-registrations', label: 'Confirmed Registrations', icon: FiCreditCard },
  { id: 'enrollments', label: 'Enrollments', icon: FiClipboard },
    { id: 'courses', label: 'Courses', icon: FiBookOpen },
    ...(hasPermission(PERMISSIONS.UPDATE_COURSE)
      ? [{ id: 'program-levels' as Tab, label: 'Program Levels', icon: FiTarget }]
      : []),
    { id: 'programs', label: 'Programs', icon: FiLayers },
    { id: 'classes', label: 'Classes', icon: FiCalendar },
    { id: 'teachers', label: 'Tutors', icon: FiUserCheck },
    ...(user?.role === 'SUPERADMIN' ? [{ id: 'pricing' as Tab, label: 'Pricing', icon: FiDollarSign }] : []),
    ...(canReadEmailTemplates ? [{ id: 'email-templates' as Tab, label: 'Email Templates', icon: FiEdit3 }] : []),
    ...(canReadEmailLogs ? [{ id: 'emails' as Tab, label: 'Email Logs', icon: FiMail }] : []),
    ...(canReadUsers ? [{ id: 'users' as Tab, label: 'Users', icon: FiUsers }] : []),
    { id: 'reports', label: 'Reports', icon: FiBarChart2, disabled: true },
    { id: 'settings', label: 'Settings', icon: FiSettings, disabled: true },
  ];

  useEffect(() => {
    setIsHydrated(true);

    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    const tabParam = searchParams.get('tab') as Tab;
    const validTabs: Tab[] = [
      'dashboard',
      'students',
      'families',
      'confirmed-registrations',
      'enrollments',
      'courses',
      'program-levels',
      'programs',
      'classes',
      'teachers',
      'pricing',
      'email-templates',
      'emails',
      'users',
      'reports',
      'settings',
    ];

    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }

    const studentId = searchParams.get('id');
    if (studentId) {
      setSelectedStudentId(studentId);
      setActiveTab('students');
    }
  }, [searchParams, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setAlerts([]);
      setAreAlertsLoading(false);
      hasLoadedAlertsRef.current = false;
      return;
    }

    let isMounted = true;

    const loadAlerts = async () => {
      if (!hasLoadedAlertsRef.current) {
        setAreAlertsLoading(true);
      }

      try {
        const [
          studentsResponse,
          classesResponse,
          familiesResponse,
          invitationsResponse,
          emailLogsResponse,
          confirmedRegistrationsResponse,
        ] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/classes?archived=false'),
          fetch('/api/families'),
          canReadUsers ? fetch('/api/users/invitations') : Promise.resolve(null),
          canReadEmailLogs ? fetch('/api/email-logs?take=200') : Promise.resolve(null),
          canReadConfirmedRegistrations ? fetch('/api/confirmed-registrations') : Promise.resolve(null),
        ]);

        const failedCoreRequest = !studentsResponse.ok || !classesResponse.ok || !familiesResponse.ok;
        const failedInviteRequest = canReadUsers && (!invitationsResponse || !invitationsResponse.ok);
        const failedEmailLogsRequest = canReadEmailLogs && (!emailLogsResponse || !emailLogsResponse.ok);
        const failedConfirmedRegistrationsRequest = canReadConfirmedRegistrations && (!confirmedRegistrationsResponse || !confirmedRegistrationsResponse.ok);

        if (failedCoreRequest || failedInviteRequest || failedEmailLogsRequest || failedConfirmedRegistrationsRequest) {
          throw new Error('Failed to load operational alerts');
        }

        const [students, classes, families] = await Promise.all([
          studentsResponse.json() as Promise<Student[]>,
          classesResponse.json() as Promise<Class[]>,
          familiesResponse.json() as Promise<Family[]>,
        ]);

        const invitations =
          canReadUsers && invitationsResponse
            ? ((await invitationsResponse.json()) as UserInvitation[])
            : [];
        const emailLogData =
          canReadEmailLogs && emailLogsResponse
            ? ((await emailLogsResponse.json()) as { logs?: EmailLog[] })
            : { logs: [] };
        const confirmedImports =
          canReadConfirmedRegistrations && confirmedRegistrationsResponse
            ? ((await confirmedRegistrationsResponse.json()) as ConfirmedRegistrationImport[])
            : [];

        if (!isMounted) return;

        setAlerts(buildOperationalAlerts({
          students,
          classes,
          families,
          invitations,
          emailLogs: emailLogData.logs || [],
          confirmedImports,
          canReadUsers,
          canReadEmailLogs,
          canReadConfirmedRegistrations,
        }));
        hasLoadedAlertsRef.current = true;
      } catch (error) {
        console.warn('Failed to load operational alerts:', error);
        if (isMounted) {
          setAlerts([]);
        }
      } finally {
        if (isMounted) {
          setAreAlertsLoading(false);
        }
      }
    };

    loadAlerts();
    const intervalId = window.setInterval(loadAlerts, 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [canReadConfirmedRegistrations, canReadEmailLogs, canReadUsers, isAuthenticated, isLoading]);

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        globalSearchInputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        setIsGlobalSearchOpen(false);
      }
    };

    const handleOutsideClick = (event: MouseEvent) => {
      if (globalSearchRef.current && !globalSearchRef.current.contains(event.target as Node)) {
        setIsGlobalSearchOpen(false);
      }
    };

    document.addEventListener('keydown', handleGlobalShortcut);
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('keydown', handleGlobalShortcut);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const loadGlobalSearchCatalog = async () => {
    if (hasLoadedGlobalSearchRef.current || isGlobalSearchLoading || !isAuthenticated) return;

    hasLoadedGlobalSearchRef.current = true;
    setIsGlobalSearchLoading(true);
    setGlobalSearchError('');

    try {
      const [studentsResponse, classesResponse, coursesResponse] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/classes?archived=false'),
        fetch('/api/courses'),
      ]);

      if (!studentsResponse.ok || !classesResponse.ok || !coursesResponse.ok) {
        throw new Error('Search data could not be loaded');
      }

      const [students, classes, courses] = await Promise.all([
        studentsResponse.json() as Promise<Student[]>,
        classesResponse.json() as Promise<Class[]>,
        coursesResponse.json() as Promise<Course[]>,
      ]);

      setSearchCatalog({ students, classes, courses });
    } catch (error) {
      console.warn('Failed to load global search data:', error);
      hasLoadedGlobalSearchRef.current = false;
      setGlobalSearchError('Search is temporarily unavailable. Click the field to try again.');
    } finally {
      setIsGlobalSearchLoading(false);
    }
  };

  const handleTabChange = (tab: Tab, options?: { preserveDirectorySearch?: boolean }) => {
    const navItem = navItems.find((item) => item.id === tab);
    if (navItem?.disabled) return;

    if (!options?.preserveDirectorySearch) {
      setDirectorySearch(null);
    }
    setActiveTab(tab);
    setIsSidebarOpen(false);
    if (tab !== 'students') {
      setSelectedStudentId('');
    }
    router.push(`/?tab=${tab}`);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const normalizedGlobalSearch = globalSearchQuery.trim().toLowerCase();
  const globalSearchResults: GlobalSearchResult[] = normalizedGlobalSearch
    ? [
        ...searchCatalog.students
          .filter((student) =>
            [
              `${student.firstName} ${student.lastName}`,
              student.email,
              student.parentEmail,
              student.parentPhone,
            ].some((value) => value?.toLowerCase().includes(normalizedGlobalSearch))
          )
          .slice(0, 5)
          .map((student) => ({
            id: student.id,
            type: 'student' as const,
            label: `${student.firstName} ${student.lastName}`.trim(),
            detail: student.email || student.parentEmail || 'Student record',
          })),
        ...searchCatalog.classes
          .filter((classItem) =>
            [classItem.name, classItem.slot, classItem.programLevel].some((value) =>
              value?.toLowerCase().includes(normalizedGlobalSearch)
            )
          )
          .slice(0, 5)
          .map((classItem) => ({
            id: classItem.id,
            type: 'class' as const,
            label: classItem.name,
            detail: classItem.slot || 'Class record',
          })),
        ...searchCatalog.courses
          .filter((course) =>
            [course.name, course.description].some((value) =>
              value?.toLowerCase().includes(normalizedGlobalSearch)
            )
          )
          .slice(0, 5)
          .map((course) => ({
            id: course.id,
            type: 'course' as const,
            label: course.name,
            detail: course.description || 'Course record',
          })),
      ].slice(0, 10)
    : [];

  const handleGlobalSearchSelect = (result: GlobalSearchResult) => {
    setGlobalSearchQuery('');
    setIsGlobalSearchOpen(false);

    if (result.type === 'student') {
      setDirectorySearch(null);
      setSelectedStudentId(result.id);
      setActiveTab('students');
      router.push(`/?tab=students&id=${result.id}`);
      return;
    }

    const tab = result.type === 'class' ? 'classes' : 'courses';
    setDirectorySearch({ tab, query: result.label, requestId: Date.now() });
    handleTabChange(tab, { preserveDirectorySearch: true });
  };

  const currentPage = pageMeta[activeTab];

  const sidebarContent = (
    <div className="flex min-h-full flex-col bg-[#05204a] text-white">
      <div className="px-6 pb-6 pt-7">
        <div className="relative h-12 w-48">
          <Image
            src="/brand/9ck-white-full-logo.png"
            alt="9jacodekids"
            fill
            priority
            sizes="192px"
            className="object-contain object-left"
          />
        </div>
        <p className="mt-4 text-sm font-semibold text-white">Academy</p>
        <p className="text-sm text-blue-100">Class Management System</p>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabChange(item.id)}
              disabled={item.disabled}
              className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/20'
                  : item.disabled
                  ? 'cursor-not-allowed text-blue-200/45'
                  : 'text-blue-50 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-inner shadow-white/5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-[#05204a]">
            <FiBarChart2 className="h-6 w-6" />
          </div>
          <p className="font-bold text-white">Academy pulse</p>
          <p className="mt-1 text-sm leading-5 text-blue-100">Track classes, capacity, and student assignment from one place.</p>
          <button
            type="button"
            onClick={() => handleTabChange('dashboard')}
            className="mt-4 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            View dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto bg-[#05204a] lg:block">
        {sidebarContent}
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close navigation"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="relative h-full w-72 overflow-y-auto bg-[#05204a] shadow-2xl">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-lg bg-white/10 p-2 text-white"
              aria-label="Close navigation"
            >
              <FiX className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 flex-wrap items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 lg:px-8 2xl:min-h-24">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden"
              aria-label="Open navigation"
            >
              <FiMenu className="h-5 w-5" />
            </button>

            <div className="min-w-48 flex-1">
              <h1 className="text-xl font-bold tracking-normal text-slate-950 2xl:text-2xl">{currentPage.title}</h1>
              <p className="mt-1 text-sm text-slate-500">{currentPage.subtitle}</p>
            </div>

            <div
              ref={globalSearchRef}
              className="relative hidden w-full max-w-xs items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm md:flex xl:max-w-sm 2xl:max-w-md"
            >
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                ref={globalSearchInputRef}
                type="search"
                placeholder="Search students, classes, courses..."
                value={globalSearchQuery}
                onFocus={() => {
                  setIsGlobalSearchOpen(true);
                  void loadGlobalSearchCatalog();
                }}
                onChange={(event) => {
                  setGlobalSearchQuery(event.target.value);
                  setIsGlobalSearchOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && globalSearchResults[0]) {
                    event.preventDefault();
                    handleGlobalSearchSelect(globalSearchResults[0]);
                  }
                }}
                aria-label="Search students, classes, and courses"
                role="combobox"
                aria-controls="global-search-results"
                aria-autocomplete="list"
                aria-expanded={isGlobalSearchOpen}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              <span className="ml-3 text-xs text-slate-400">⌘K</span>

              {isGlobalSearchOpen && (globalSearchQuery.trim() || isGlobalSearchLoading || globalSearchError) && (
                <div
                  id="global-search-results"
                  className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                >
                  {isGlobalSearchLoading ? (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">Loading search...</p>
                  ) : globalSearchError ? (
                    <button
                      type="button"
                      onClick={() => void loadGlobalSearchCatalog()}
                      className="w-full rounded-lg px-3 py-4 text-center text-sm text-rose-600 hover:bg-rose-50"
                    >
                      {globalSearchError}
                    </button>
                  ) : globalSearchResults.length ? (
                    globalSearchResults.map((result) => {
                      const ResultIcon = result.type === 'student'
                        ? FiUsers
                        : result.type === 'class'
                        ? FiCalendar
                        : FiBookOpen;

                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          type="button"
                          onClick={() => handleGlobalSearchSelect(result)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-blue-50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <ResultIcon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{result.label}</span>
                            <span className="block truncate text-xs text-slate-500">{result.detail}</span>
                          </span>
                          <span className="text-[11px] font-semibold uppercase text-slate-400">{result.type}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">No matching records found.</p>
                  )}
                </div>
              )}
            </div>

            <OperationalAlertsBell
              alerts={alerts}
              isLoading={areAlertsLoading}
              onNavigate={handleTabChange}
            />

            {user && (
              <div className="hidden items-center gap-3 border-l border-slate-200 pl-4 sm:flex">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <FiUser className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs capitalize text-slate-500">{user.role.toLowerCase()}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Logout"
                >
                  <FiLogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {!isHydrated || isLoading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
                <p className="text-sm text-slate-600">Loading application...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  onNavigate={handleTabChange}
                  onSelectStudent={(studentId) => {
                    setSelectedStudentId(studentId);
                    setActiveTab('students');
                    router.push(`/?tab=students&id=${studentId}`);
                  }}
                />
              )}
              {activeTab === 'students' && <StudentManagement selectedStudentId={selectedStudentId} />}
              {activeTab === 'families' && <FamiliesManagement />}
              {activeTab === 'confirmed-registrations' && (
                <ConfirmedRegistrationsManagement
                  canEditPayments={user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'}
                />
              )}
              {activeTab === 'enrollments' && <EnrollmentManagement />}
              {activeTab === 'courses' && (
                <CoursesManagement
                  initialSearch={directorySearch?.tab === 'courses' ? directorySearch.query : ''}
                  searchRequestId={directorySearch?.tab === 'courses' ? directorySearch.requestId : 0}
                />
              )}
              {activeTab === 'program-levels' && <ProgramLevelsManagement />}
              {activeTab === 'programs' && <ProgramsManagement />}
              {activeTab === 'classes' && (
                <ClassManagement
                  initialSearch={directorySearch?.tab === 'classes' ? directorySearch.query : ''}
                  searchRequestId={directorySearch?.tab === 'classes' ? directorySearch.requestId : 0}
                />
              )}
              {activeTab === 'teachers' && <TeachersManagement />}
              {activeTab === 'pricing' && <PricingPage />}
              {activeTab === 'email-templates' && canReadEmailTemplates && <EmailTemplatesManagement />}
              {activeTab === 'emails' && canReadEmailLogs && <EmailLogsManagement />}
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'reports' && (
                <ComingSoonPanel
                  title="Reports"
                  description="Dashboard analytics are available now. A fuller reports workspace can be designed after the core management screens are updated."
                />
              )}
              {activeTab === 'settings' && (
                <ComingSoonPanel
                  title="Settings"
                  description="Settings are reserved for a later phase so this dashboard refresh stays focused and low-risk."
                />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f5f7fb]">
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="text-sm text-slate-600">Loading application...</p>
            </div>
          </div>
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
