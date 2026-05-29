'use client';

import { useState, useEffect, Suspense } from 'react';
import type { ComponentType } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiDollarSign,
  FiGrid,
  FiHome,
  FiLayers,
  FiLogOut,
  FiMenu,
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

type Tab =
  | 'dashboard'
  | 'students'
  | 'families'
  | 'enrollments'
  | 'courses'
  | 'program-levels'
  | 'programs'
  | 'classes'
  | 'teachers'
  | 'pricing'
  | 'users'
  | 'reports'
  | 'settings';

type NavItem = {
  id: Tab;
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
};

const pageMeta: Record<Tab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your academy' },
  students: { title: 'Students', subtitle: 'Manage learners and parent records' },
  families: { title: 'Families', subtitle: 'Manage households, guardians, and sibling groups' },
  enrollments: { title: 'Enrollments', subtitle: 'Track student enrollment activity' },
  courses: { title: 'Courses', subtitle: 'Manage course catalog' },
  'program-levels': { title: 'Program Levels', subtitle: 'Manage level availability across courses' },
  programs: { title: 'Programs', subtitle: 'Organize seasons, batches, and cohorts' },
  classes: { title: 'Classes', subtitle: 'Manage sessions, tutors, and meeting links' },
  teachers: { title: 'Teachers', subtitle: 'Manage tutors and assignments' },
  pricing: { title: 'Pricing', subtitle: 'Maintain tuition and discount options' },
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

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
    { id: 'students', label: 'Students', icon: FiUsers },
    { id: 'families', label: 'Families', icon: FiHome },
    { id: 'enrollments', label: 'Enrollments', icon: FiClipboard },
    { id: 'courses', label: 'Courses', icon: FiBookOpen },
    ...(hasPermission(PERMISSIONS.UPDATE_COURSE)
      ? [{ id: 'program-levels' as Tab, label: 'Program Levels', icon: FiTarget }]
      : []),
    { id: 'programs', label: 'Programs', icon: FiLayers },
    { id: 'classes', label: 'Classes', icon: FiCalendar },
    { id: 'teachers', label: 'Teachers', icon: FiUserCheck },
    ...(user?.role === 'SUPERADMIN' ? [{ id: 'pricing' as Tab, label: 'Pricing', icon: FiDollarSign }] : []),
    ...(hasPermission(PERMISSIONS.READ_USERS) ? [{ id: 'users' as Tab, label: 'Users', icon: FiUsers }] : []),
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
      'enrollments',
      'courses',
      'program-levels',
      'programs',
      'classes',
      'teachers',
      'pricing',
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

  const handleTabChange = (tab: Tab) => {
    const navItem = navItems.find((item) => item.id === tab);
    if (navItem?.disabled) return;

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

            <div className="hidden w-full max-w-xs items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm md:flex xl:max-w-sm 2xl:max-w-md">
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="search"
                placeholder="Search students, classes, courses..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              <span className="ml-3 text-xs text-slate-400">⌘K</span>
            </div>

            <button
              type="button"
              className="relative rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
              aria-label="Notifications"
            >
              <FiBell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                3
              </span>
            </button>

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
              {activeTab === 'enrollments' && <EnrollmentManagement />}
              {activeTab === 'courses' && <CoursesManagement />}
              {activeTab === 'program-levels' && <ProgramLevelsManagement />}
              {activeTab === 'programs' && <ProgramsManagement />}
              {activeTab === 'classes' && <ClassManagement />}
              {activeTab === 'teachers' && <TeachersManagement />}
              {activeTab === 'pricing' && <PricingPage />}
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
