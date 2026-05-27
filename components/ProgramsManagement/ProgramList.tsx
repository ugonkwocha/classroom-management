'use client';

import { Program } from '@/types';
import { Badge } from '@/components/ui';
import { FiCalendar, FiEdit3, FiEye, FiTrash2 } from 'react-icons/fi';

interface ProgramListProps {
  programs: Program[];
  onEdit: (program: Program) => void;
  onDelete: (id: string) => void;
  onView: (program: Program) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ProgramList({ programs, onEdit, onDelete, onView, canEdit = true, canDelete = true }: ProgramListProps) {
  if (programs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FiCalendar className="h-6 w-6" />
        </div>
        <p className="text-base font-bold text-slate-950">No programs found</p>
        <p className="mt-1 text-sm text-slate-500">Create a program to define academy seasons, batches, and time slots.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
            <th className="px-5 py-4">Program</th>
            <th className="px-5 py-4">Type</th>
            <th className="px-5 py-4">Batches</th>
            <th className="px-5 py-4">Slots</th>
            <th className="px-5 py-4">Start Date</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {programs.map((program) => (
            <tr key={program.id} className="transition hover:bg-slate-50">
              <td className="px-5 py-4">
                <button type="button" onClick={() => onView(program)} className="flex items-center gap-3 text-left">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <FiCalendar className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-bold text-slate-950">{program.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">{program.season} {program.year}</span>
                  </span>
                </button>
              </td>
              <td className="px-5 py-4">
                <Badge variant="primary">{program.type === 'WEEKEND_CLUB' ? 'Weekend Club' : 'Holiday Camp'}</Badge>
              </td>
              <td className="px-5 py-4">
                <Badge variant="success">{program.batches} batch{program.batches > 1 ? 'es' : ''}</Badge>
              </td>
              <td className="px-5 py-4">
                <div className="flex max-w-sm flex-wrap gap-2">
                  {program.slots.map((slot, index) => (
                    <span key={index} className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      {slot}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-5 py-4 text-slate-600">{program.startDate || 'Not set'}</td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onView(program)}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                    aria-label={`View ${program.name}`}
                  >
                    <FiEye className="h-4 w-4" />
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(program)}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                      aria-label={`Edit ${program.name}`}
                    >
                      <FiEdit3 className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(program.id)}
                      className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                      aria-label={`Delete ${program.name}`}
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
