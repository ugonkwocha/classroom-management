'use client';

import { Student } from '@/types';
import { Badge, Button } from '@/components/ui';
import { calculateAge } from '@/lib/utils';

interface StudentListProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}

export function StudentList({ students, onEdit, onDelete }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No students yet. Add one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {students.map((student) => (
        <div
          key={student.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{student.name}</h3>
            <div className="flex gap-2 mt-2 text-sm text-gray-600">
              <span>Age: {calculateAge(student.dateOfBirth)}</span>
              <span>•</span>
              <span>{student.contactInfo}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <Badge variant="primary">{student.programLevel}</Badge>
              {student.isReturning && <Badge variant="success">Returning</Badge>}
              {student.hasSiblings && <Badge variant="info">Has Siblings</Badge>}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(student)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(student.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
