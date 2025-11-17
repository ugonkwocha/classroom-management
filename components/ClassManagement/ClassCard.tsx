'use client';

import { motion } from 'framer-motion';
import { Class, Teacher } from '@/types';
import { Badge, Button } from '@/components/ui';

interface ClassCardProps {
  classData: Class;
  onEdit: (classData: Class) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onViewStudents: (classData: Class) => void;
  studentCount: number;
  teacher?: Teacher;
}

export function ClassCard({ classData, onEdit, onDelete, onArchive, onUnarchive, onViewStudents, studentCount, teacher }: ClassCardProps) {
  const capacity = classData.capacity;
  const percentage = Math.round((studentCount / capacity) * 100);
  const isFull = studentCount >= capacity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="cursor-pointer flex-1" onClick={() => onViewStudents(classData)}>
          <h3 className="font-semibold text-gray-900 hover:text-purple-600 transition-colors">{classData.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Teacher: {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}
          </p>
        </div>
        <div className="flex gap-2 items-start">
          {classData.isArchived && (
            <Badge variant="info">ARCHIVED</Badge>
          )}
          <Badge variant={isFull ? 'warning' : 'success'}>
            {isFull ? 'FULL' : 'AVAILABLE'}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            {studentCount} / {capacity} Students
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${
                percentage < 50 ? 'bg-green-500' : percentage < 100 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="primary">{classData.programLevel}</Badge>
          <Badge variant="info">{classData.schedule}</Badge>
        </div>

        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onViewStudents(classData)}
            className="flex-1"
          >
            View Students
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(classData)}
            className="flex-1"
            disabled={classData.isArchived}
            title={classData.isArchived ? 'Cannot edit archived class' : ''}
          >
            Edit
          </Button>
          {classData.isArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUnarchive(classData.id)}
              className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Unarchive
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onArchive(classData.id)}
              className="flex-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              Archive
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(classData.id)}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
