'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { Dashboard } from '@/components/Dashboard';
import { StudentManagement } from '@/components/StudentManagement';
import { ClassManagement } from '@/components/ClassManagement';
import { CoursesManagement } from '@/components/CoursesManagement';
import { ProgramsManagement } from '@/components/ProgramsManagement';
import { TeachersManagement } from '@/components/TeachersManagement';
import { UserManagement } from '@/components/UserManagement';
import { PricingPage } from '@/components/PricingManagement';
import { Button } from '@/components/ui';

type Tab = 'dashboard' | 'students' | 'courses' | 'programs' | 'classes' | 'teachers' | 'users' | 'pricing';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    setIsHydrated(true);

    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Handle tab from query parameter
    const tabParam = searchParams.get('tab') as Tab;
    const validTabs: Tab[] = ['dashboard', 'students', 'courses', 'programs', 'classes', 'teachers', 'users', 'pricing'];

    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }

    // Handle student ID from query parameter
    const studentId = searchParams.get('id');
    if (studentId) {
      setSelectedStudentId(studentId);
      setActiveTab('students');
    }
  }, [searchParams, isAuthenticated, isLoading, router]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'students', label: 'Students' },
    { id: 'courses', label: 'Courses' },
    { id: 'programs', label: 'Programs' },
    { id: 'classes', label: 'Classes' },
    { id: 'teachers', label: 'Teachers' },
    ...(hasPermission(PERMISSIONS.READ_USERS) ? [{ id: 'users' as Tab, label: 'Users' }] : []),
    ...(user?.role === 'SUPERADMIN' ? [{ id: 'pricing' as Tab, label: 'Pricing' }] : []),
  ];

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Academy Enrollment
              </h1>
              <p className="text-gray-600 text-sm mt-1">Transcend AI Academy - Class Management System</p>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
                </div>
                <Button
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-2 py-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Clear selectedStudentId when manually clicking tabs
                  if (tab.id !== 'students') {
                    setSelectedStudentId('');
                  }
                  // Update URL with tab parameter
                  router.push(`/?tab=${tab.id}`);
                }}
                className={`px-6 py-2 font-medium text-sm whitespace-nowrap rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isHydrated ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600">Loading application...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard onSelectStudent={(studentId) => {
                setSelectedStudentId(studentId);
                setActiveTab('students');
                router.push(`/?tab=students&id=${studentId}`);
              }} />
            )}
            {activeTab === 'students' && <StudentManagement selectedStudentId={selectedStudentId} />}
            {activeTab === 'courses' && <CoursesManagement />}
            {activeTab === 'programs' && <ProgramsManagement />}
            {activeTab === 'classes' && <ClassManagement />}
            {activeTab === 'teachers' && <TeachersManagement />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'pricing' && <PricingPage />}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>© 2024 Transcend AI Academy. All rights reserved.</p>
            <p className="mt-2">Using local storage for data persistence</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Academy Enrollment
                </h1>
                <p className="text-gray-600 text-sm mt-1">Transcend AI Academy - Class Management System</p>
              </div>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600">Loading application...</p>
          </div>
        </div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
