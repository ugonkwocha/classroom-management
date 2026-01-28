'use client';

import { useState, useMemo } from 'react';
import { useTeachers, useCourses, useClasses, usePrograms } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Teacher } from '@/types';
import { Card, Modal, Button } from '@/components/ui';
import { PERMISSIONS } from '@/lib/permissions';
import { TeacherForm } from './TeacherForm';
import { TeacherList } from './TeacherList';
import { TeacherDetailsView } from './TeacherDetailsView';

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
      <Card className="bg-red-50 border-red-200">
        <p className="text-red-800">
          Unable to load teachers. You may not have permission to view teachers. Please contact an administrator if you believe this is an error.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search teachers..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800"
          >
            + Add Teacher
          </button>
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          ℹ️ Teachers can be assigned to classes based on their course qualifications. A teacher
          cannot teach multiple classes at the same time slot.
        </p>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {[
          { key: 'all' as TabType, label: 'All Teachers', count: teachers.length },
          { key: 'active' as TabType, label: 'Active', count: teachers.filter((t) => t.status === 'ACTIVE').length },
          { key: 'inactive' as TabType, label: 'Inactive', count: teachers.filter((t) => t.status === 'INACTIVE').length },
          { key: 'on-leave' as TabType, label: 'On Leave', count: teachers.filter((t) => t.status === 'ON_LEAVE').length },
          { key: 'unassigned' as TabType, label: 'Unassigned', count: unassignedTeacherIds.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {tab.count > 0 && <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Teacher List */}
      <Card>
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
      </Card>

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
