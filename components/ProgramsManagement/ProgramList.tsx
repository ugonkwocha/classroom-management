'use client';

import { Program } from '@/types';
import { Badge, Button } from '@/components/ui';

interface ProgramListProps {
  programs: Program[];
  onEdit: (program: Program) => void;
  onDelete: (id: string) => void;
  onView: (program: Program) => void;
}

export function ProgramList({ programs, onEdit, onDelete, onView }: ProgramListProps) {
  if (programs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No programs found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {programs.map((program) => (
        <div
          key={program.id}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{program.name} - {program.year}</h3>
              <div className="flex gap-2 mt-2">
                <Badge variant="primary">{program.season}</Badge>
                <Badge variant="info">{program.type === 'WeekendClub' ? 'Weekend' : 'Holiday'}</Badge>
                <Badge variant="success">{program.batches} Batch{program.batches > 1 ? 'es' : ''}</Badge>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <p className="text-xs text-gray-600 font-semibold mb-2">Time Slots:</p>
            <div className="flex flex-wrap gap-2">
              {program.slots.map((slot, index) => (
                <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {slot}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-gray-200">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onView(program)}
              className="flex-1"
            >
              View Classes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(program)}
              className="flex-1"
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(program.id)}
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
