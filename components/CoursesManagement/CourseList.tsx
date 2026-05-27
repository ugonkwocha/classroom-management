'use client';

import { Course } from '@/types';
import { Badge } from '@/components/ui';
import { useProgramLevelSettings } from '@/lib/hooks';
import { getProgramLevelLabel } from '@/lib/program-levels';
import { FiBookOpen, FiEdit3, FiTrash2 } from 'react-icons/fi';

interface CourseListProps {
  courses: Course[];
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function CourseList({ courses, onEdit, onDelete, canEdit = true, canDelete = true }: CourseListProps) {
  const { settings } = useProgramLevelSettings();

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FiBookOpen className="h-6 w-6" />
        </div>
        <p className="text-base font-bold text-slate-950">No courses yet</p>
        <p className="mt-1 text-sm text-slate-500">Create a course to use it in programs and classes.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
            <th className="px-5 py-4">Course</th>
            <th className="px-5 py-4">Description</th>
            <th className="px-5 py-4">Program Levels</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {courses.map((course) => (
            <tr key={course.id} className="transition hover:bg-slate-50">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <FiBookOpen className="h-5 w-5" />
                  </span>
                  <span className="font-bold text-slate-950">{course.name}</span>
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="max-w-md text-slate-600">{course.description}</p>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {course.programLevels.map((level) => (
                    <Badge key={level} variant="primary">
                      {getProgramLevelLabel(settings, level)}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(course)}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                      aria-label={`Edit ${course.name}`}
                    >
                      <FiEdit3 className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(course.id)}
                      className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                      aria-label={`Delete ${course.name}`}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
