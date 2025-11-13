'use client';

import { Course } from '@/types';
import { Badge, Button } from '@/components/ui';

interface CourseListProps {
  courses: Course[];
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
}

export function CourseList({ courses, onEdit, onDelete }: CourseListProps) {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No courses yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {courses.map((course) => (
        <div
          key={course.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{course.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{course.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {course.programLevels.map((level) => (
                <Badge key={level} variant="primary">
                  {level}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(course)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(course.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
