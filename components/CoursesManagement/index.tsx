'use client';

import { useState } from 'react';
import { useCourses, useProgramLevelSettings } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Course } from '@/types';
import { Modal } from '@/components/ui';
import { PERMISSIONS } from '@/lib/permissions';
import { getProgramLevelLabel } from '@/lib/program-levels';
import { CourseForm } from './CourseForm';
import { CourseList } from './CourseList';
import { FiBookOpen, FiLayers, FiPlus, FiSearch, FiTarget } from 'react-icons/fi';

export function CoursesManagement() {
  const { courses, isLoaded, addCourse, updateCourse, deleteCourse } = useCourses();
  const { settings } = useProgramLevelSettings();
  const { hasPermission } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | undefined>();
  const [filter, setFilter] = useState<string>('');

  const canCreate = hasPermission(PERMISSIONS.CREATE_COURSE);
  const canEdit = hasPermission(PERMISSIONS.UPDATE_COURSE);
  const canDelete = hasPermission(PERMISSIONS.DELETE_COURSE);

  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(filter.toLowerCase()) ||
    course.description.toLowerCase().includes(filter.toLowerCase()) ||
    course.programLevels.some((level) =>
      `${level} ${getProgramLevelLabel(settings, level)}`.toLowerCase().includes(filter.toLowerCase())
    )
  );

  const handleSubmit = (courseData: Omit<Course, 'id' | 'createdAt'>) => {
    if (editingCourse) {
      updateCourse(editingCourse.id, courseData);
      setEditingCourse(undefined);
    } else {
      addCourse(courseData);
    }
    setIsModalOpen(false);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteCourse(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete course';
        console.error('Error deleting course:', error);
        alert(`Error deleting course: ${errorMessage}`);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCourse(undefined);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  const levelCount = (level: string) => courses.filter((course) => course.programLevels.includes(level)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiBookOpen className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Total Courses</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{courses.length}</p>
        </div>
        {settings.slice(0, 3).map((setting, index) => {
          const accents = [
            'bg-emerald-50 text-emerald-600',
            'bg-yellow-50 text-yellow-600',
            'bg-rose-50 text-rose-600',
          ];
          const Icon = index === 0 ? FiTarget : FiLayers;
          return (
            <div key={setting.level} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${accents[index] || 'bg-blue-50 text-blue-600'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-500">{getProgramLevelLabel(settings, setting.level)}</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{levelCount(setting.level)}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Course Catalog</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredCourses.length} courses shown</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm sm:w-80">
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses..."
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
                Add Course
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          <CourseList
            courses={filteredCourses}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </div>
      </section>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCourse ? 'Edit Course' : 'Add New Course'}>
        <CourseForm onSubmit={handleSubmit} onCancel={handleCloseModal} initialData={editingCourse} />
      </Modal>
    </div>
  );
}
