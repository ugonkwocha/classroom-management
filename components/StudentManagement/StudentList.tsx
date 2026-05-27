'use client';

import { Student } from '@/types';
import { calculateAge } from '@/lib/utils';
import { FiBookOpen, FiEdit3, FiEye, FiTrash2, FiUser } from 'react-icons/fi';

interface StudentListProps {
  students: Student[];
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function StudentList({ students, onView, onEdit, onDelete, canEdit = true, canDelete = true }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FiUser className="h-6 w-6" />
        </div>
        <p className="text-base font-bold text-slate-950">No students yet</p>
        <p className="mt-1 text-sm text-slate-500">Add a student to begin managing enrollments and class assignments.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
            <th className="px-5 py-4">Student</th>
            <th className="px-5 py-4">Parent Contact</th>
            <th className="px-5 py-4">Age</th>
            <th className="px-5 py-4">Assignments</th>
            <th className="px-5 py-4">Payment</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const age = student.dateOfBirth ? calculateAge(student.dateOfBirth) : null;
            const enrollments = student.programEnrollments || student.enrollments || [];
            const classAssignmentCount = enrollments.filter((enrollment) => enrollment.classId).length;
            const historyCount = student.courseHistory?.length || 0;
            const paymentStatusStyles = {
              PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
              CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-100',
              COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            } as const;

            return (
              <tr key={student.id} className="transition hover:bg-slate-50">
                <td className="px-5 py-4">
                  <button type="button" onClick={() => onView(student)} className="flex items-center gap-3 text-left">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <FiUser className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-bold text-slate-950">
                        {student.firstName} {student.lastName}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">{student.email || 'No student email'}</span>
                    </span>
                  </button>
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-700">{student.parentEmail || 'No parent email'}</p>
                  <p className="mt-1 text-xs text-slate-500">{student.parentPhone || student.phone || 'No phone saved'}</p>
                </td>
                <td className="px-5 py-4 text-slate-600">{age !== null ? age : 'Not set'}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      <FiBookOpen className="h-3.5 w-3.5" />
                      {classAssignmentCount} assigned
                    </span>
                    {historyCount > 0 && (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                        {historyCount} history
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                      paymentStatusStyles[student.paymentStatus] || paymentStatusStyles.PENDING
                    }`}
                  >
                    {student.paymentStatus}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                      student.isReturningStudent
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {student.isReturningStudent ? 'Returning' : 'New'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onView(student)}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                      aria-label={`View ${student.firstName} ${student.lastName}`}
                    >
                      <FiEye className="h-4 w-4" />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(student)}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                        aria-label={`Edit ${student.firstName} ${student.lastName}`}
                      >
                        <FiEdit3 className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(student.id)}
                        className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                        aria-label={`Delete ${student.firstName} ${student.lastName}`}
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
