'use client';

import { useState, useMemo } from 'react';
import { useTeachers, useCourses, useClasses, usePrograms } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Teacher } from '@/types';
import { Modal } from '@/components/ui';
import { PERMISSIONS } from '@/lib/permissions';
import { TeacherForm } from './TeacherForm';
import { TeacherList } from './TeacherList';
import { TeacherDetailsView } from './TeacherDetailsView';
import { FiBriefcase, FiClock, FiPlus, FiSearch, FiUserCheck, FiUserX, FiUsers } from 'react-icons/fi';

type TabType = 'all' | 'active' | 'inactive' | 'on-leave' | 'unassigned';

export function TeachersManagement() {
  const { teachers, isLoaded, error, addTeacher, updateTeacher, deleteTeacher } = useTeachers();
  const { courses } = useCourses();
  const { classes } = useClasses();
  const { programs } = usePrograms();
  const { hasPermission } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | undefined>();
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | undefined>();
  const [filter, setFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const canCreate = hasPermission(PERMISSIONS.CREATE_TEACHER);
  const canEdit = hasPermission(PERMISSIONS.UPDATE_TEACHER);
  const canDelete = hasPermission(PERMISSIONS.DELETE_TEACHER);

  // Get unassigned teachers (teachers with no classes assigned)
  const assignedTeacherIds = useMemo(() => {
    const assigned = new Set<string>();
    classes.forEach((cls) => {
      if (cls.teacherId) {
        assigned.add(cls.teacherId);
      }
    });
    return Array.from(assigned);
  }, [classes]);

  const unassignedTeacherIds = useMemo(
    () => teachers.filter((t) => !assignedTeacherIds.includes(t.id)).map((t) => t.id),
    [teachers, assignedTeacherIds]
  );

  // Filter teachers based on tab and search
  const filteredTeachers = useMemo(() => {
    let result = teachers.filter(
      (teacher) =>
        teacher.firstName.toLowerCase().includes(filter.toLowerCase()) ||
        teacher.lastName.toLowerCase().includes(filter.toLowerCase()) ||
        teacher.email.toLowerCase().includes(filter.toLowerCase())
    );

    switch (activeTab) {
      case 'active':
        return result.filter((t) => t.status === 'ACTIVE');
      case 'inactive':
        return result.filter((t) => t.status === 'INACTIVE');
      case 'on-leave':
        return result.filter((t) => t.status === 'ON_LEAVE');
      case 'unassigned':
        return result.filter((t) => unassignedTeacherIds.includes(t.id));
      default:
        return result;
    }
  }, [teachers, filter, activeTab, unassignedTeacherIds]);

  const handleSubmit = (teacherData: Omit<Teacher, 'id' | 'createdAt'>) => {
    if (editingTeacher) {
      updateTeacher(editingTeacher.id, teacherData);
      setEditingTeacher(undefined);
    } else {
      addTeacher(teacherData);
    }
    setIsModalOpen(false);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await deleteTeacher(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete teacher';
        console.error('Error deleting teacher:', error);
        alert(`Error deleting teacher: ${errorMessage}`);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(undefined);
  };

  const handleView = (teacher: Teacher) => {
    setViewingTeacher(teacher);
  };

  const handleCloseDetailsView = () => {
    setViewingTeacher(undefined);
  };

  if (!isLoaded && !error) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
        <p className="text-sm font-medium text-rose-700">
          Unable to load teachers. You may not have permission to view teachers. Please contact an administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  const tabs = [
    { key: 'all' as TabType, label: 'All Teachers', count: teachers.length },
    { key: 'active' as TabType, label: 'Active', count: teachers.filter((t) => t.status === 'ACTIVE').length },
    { key: 'inactive' as TabType, label: 'Inactive', count: teachers.filter((t) => t.status === 'INACTIVE').length },
    { key: 'on-leave' as TabType, label: 'On Leave', count: teachers.filter((t) => t.status === 'ON_LEAVE').length },
    { key: 'unassigned' as TabType, label: 'Unassigned', count: unassignedTeacherIds.length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiUsers className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Total Teachers</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{teachers.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiUserCheck className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Active</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{teachers.filter((t) => t.status === 'ACTIVE').length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FiClock className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">On Leave</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{teachers.filter((t) => t.status === 'ON_LEAVE').length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <FiUserX className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Unassigned</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{unassignedTeacherIds.length}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Teacher Directory</h2>
            <p className="mt-1 text-sm text-slate-500">Teachers are matched to classes by course qualification and availability.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm sm:w-80">
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search teachers..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <FiPlus className="h-4 w-4" />
                Add Teacher
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-slate-100 px-5 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                }`}
              >
                {tab.label}
                <span className={activeTab === tab.key ? 'text-blue-100' : 'text-slate-400'}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          <TeacherList
            teachers={filteredTeachers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            showUnassignedOnly={activeTab === 'unassigned'}
            unassignedTeacherIds={unassignedTeacherIds}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
            <FiBriefcase className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium leading-6 text-blue-800">
            Teachers can be assigned to classes based on their course qualifications. The system also checks same-slot conflicts before assignment.
          </p>
        </div>
      </section>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}>
        <TeacherForm onSubmit={handleSubmit} onCancel={handleCloseModal} initialData={editingTeacher} />
      </Modal>

      {/* Details Modal */}
      <Modal isOpen={!!viewingTeacher} onClose={handleCloseDetailsView} title="" size="lg">
        {viewingTeacher && (
          <TeacherDetailsView
            teacher={viewingTeacher}
            courses={courses}
            programs={programs}
            classes={classes}
            onClose={handleCloseDetailsView}
            onEdit={() => {
              handleCloseDetailsView();
              handleEdit(viewingTeacher);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
