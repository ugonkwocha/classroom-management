'use client';

import { Teacher, TeacherStatus } from '@/types';
import { Badge } from '@/components/ui';
import { FiEdit3, FiEye, FiTrash2, FiUserCheck } from 'react-icons/fi';

interface TeacherListProps {
  teachers: Teacher[];
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
  onView: (teacher: Teacher) => void;
  showUnassignedOnly?: boolean;
  unassignedTeacherIds?: string[];
  canEdit?: boolean;
  canDelete?: boolean;
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
  canEdit = true,
  canDelete = true,
}: TeacherListProps) {
  let filteredTeachers = teachers;

  if (showUnassignedOnly) {
    filteredTeachers = teachers.filter((t) => unassignedTeacherIds.includes(t.id));
  }

  if (filteredTeachers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FiUserCheck className="h-6 w-6" />
        </div>
        <p className="text-base font-bold text-slate-950">
          {showUnassignedOnly ? 'No unassigned teachers' : 'No teachers found'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {showUnassignedOnly ? 'Every teacher is currently assigned to at least one class.' : 'Add a teacher to manage class assignments.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
            <th className="px-5 py-4">Teacher</th>
            <th className="px-5 py-4">Contact</th>
            <th className="px-5 py-4">Qualifications</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Assignment</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredTeachers.map((teacher) => {
            const isUnassigned = unassignedTeacherIds.includes(teacher.id);

            return (
              <tr key={teacher.id} className="transition hover:bg-slate-50">
                <td className="px-5 py-4">
                  <button type="button" onClick={() => onView(teacher)} className="flex items-center gap-3 text-left">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <FiUserCheck className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-bold text-slate-950">
                        {teacher.firstName} {teacher.lastName}
                      </span>
                      <span className="mt-1 block max-w-[260px] truncate text-xs text-slate-500">
                        {teacher.bio || 'No bio saved'}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-700">{teacher.email}</p>
                  <p className="mt-1 text-xs text-slate-500">{teacher.phone}</p>
                </td>
                <td className="px-5 py-4">
                  <Badge variant="primary">{teacher.qualifiedCourses.length} courses</Badge>
                </td>
                <td className="px-5 py-4">
                  <Badge variant={statusColors[teacher.status]}>{teacher.status.replace('_', ' ')}</Badge>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                      isUnassigned
                        ? 'border-amber-100 bg-amber-50 text-amber-700'
                        : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isUnassigned ? 'Unassigned' : 'Assigned'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onView(teacher)}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                      aria-label={`View ${teacher.firstName} ${teacher.lastName}`}
                    >
                      <FiEye className="h-4 w-4" />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(teacher)}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                        aria-label={`Edit ${teacher.firstName} ${teacher.lastName}`}
                      >
                        <FiEdit3 className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete ${teacher.firstName} ${teacher.lastName}?`)) {
                            onDelete(teacher.id);
                          }
                        }}
                        className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                        aria-label={`Delete ${teacher.firstName} ${teacher.lastName}`}
                      >
                        <FiTrash2 className="h-4 w-4" />
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
  );
}
