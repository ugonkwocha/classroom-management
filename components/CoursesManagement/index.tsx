'use client';

import { useState } from 'react';
import { useCourses } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Course } from '@/types';
import { Card, Modal } from '@/components/ui';
import { PERMISSIONS } from '@/lib/permissions';
import { CourseForm } from './CourseForm';
import { CourseList } from './CourseList';

export function CoursesManagement() {
  const { courses, isLoaded, addCourse, updateCourse, deleteCourse } = useCourses();
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
    course.programLevels.some((level) => level.toLowerCase().includes(filter.toLowerCase()))
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
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search courses..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800"
          >
            + Add Course
          </button>
        )}
      </div>

      <Card>
        <CourseList
          courses={filteredCourses}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCourse ? 'Edit Course' : 'Add New Course'}>
        <CourseForm onSubmit={handleSubmit} onCancel={handleCloseModal} initialData={editingCourse} />
      </Modal>
    </div>
  );
}
