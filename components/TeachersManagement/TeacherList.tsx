'use client';

import { Teacher, TeacherStatus } from '@/types';
import { Badge, Button } from '@/components/ui';

interface TeacherListProps {
  teachers: Teacher[];
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
  onView: (teacher: Teacher) => void;
  showUnassignedOnly?: boolean;
  unassignedTeacherIds?: string[];
}

const statusColors: Record<TeacherStatus, 'primary' | 'warning' | 'danger' | 'success' | 'info'> = {
  ACTIVE: 'success',
  INACTIVE: 'danger',
  ON_LEAVE: 'warning',
};

export function TeacherList({
  teachers,
  onEdit,
  onDelete,
  onView,
  showUnassignedOnly = false,
  unassignedTeacherIds = [],
}: TeacherListProps) {
  let filteredTeachers = teachers;

  if (showUnassignedOnly) {
    filteredTeachers = teachers.filter((t) => unassignedTeacherIds.includes(t.id));
  }

  if (filteredTeachers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {showUnassignedOnly ? 'No unassigned teachers found.' : 'No teachers found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredTeachers.map((teacher) => (
        <div
          key={teacher.id}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {teacher.firstName} {teacher.lastName}
              </h3>
              <div className="flex gap-2 mt-2">
                <Badge variant={statusColors[teacher.status]}>{teacher.status}</Badge>
                <Badge variant="info">{teacher.qualifiedCourses.length} Course(s)</Badge>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>{teacher.email}</p>
                <p>{teacher.phone}</p>
              </div>
            </div>
          </div>

          {teacher.bio && (
            <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
              <p>{teacher.bio}</p>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-gray-200">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onView(teacher)}
              className="flex-1"
            >
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(teacher)}
              className="flex-1"
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm(`Delete ${teacher.firstName} ${teacher.lastName}?`)) {
                  onDelete(teacher.id);
                }
              }}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
