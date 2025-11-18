'use client';

import { Student } from '@/types';
import { Badge, Button } from '@/components/ui';
import { calculateAge } from '@/lib/utils';

interface StudentListProps {
  students: Student[];
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}

export function StudentList({ students, onView, onEdit, onDelete }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No students yet. Add one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {students.map((student) => {
        const age = student.dateOfBirth ? calculateAge(student.dateOfBirth) : null;
        // Only count class assignments (enrollments with classId)
        const classAssignmentCount = (student.programEnrollments || []).filter((e) => e.classId).length;
        const historyCount = student.courseHistory?.length || 0;

        return (
          <div
            key={student.id}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div
              className="flex-1 cursor-pointer"
              onClick={() => onView(student)}
            >
              <h3 className="font-semibold text-gray-900">
                {student.firstName} {student.lastName}
              </h3>
              <div className="flex gap-2 mt-2 text-sm text-gray-600">
                {age !== null && (
                  <>
                    <span>Age: {age}</span>
                    <span>•</span>
                  </>
                )}
                <span>{student.email || 'No email'}</span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {student.isReturningStudent && <Badge variant="success">🔄 Returning</Badge>}
                {classAssignmentCount > 0 && (
                  <Badge variant="primary">
                    {classAssignmentCount} assignment{classAssignmentCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                {historyCount > 0 && (
                  <Badge variant="info">
                    {historyCount} course{historyCount !== 1 ? 's' : ''} history
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(student)}
              >
                View
              </Button>
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
        );
      })}
    </div>
  );
}
