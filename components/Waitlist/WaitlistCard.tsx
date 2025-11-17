'use client';

import { motion } from 'framer-motion';
import { WaitlistEntry, Student } from '@/types';
import { Badge, Button } from '@/components/ui';

interface WaitlistCardProps {
  entry: WaitlistEntry;
  student?: Student;
  onRemove: (id: string) => void;
  index: number;
}

export function WaitlistCard({ entry, student, onRemove, index }: WaitlistCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex items-center justify-between p-4 bg-white border border-amber-200 rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{student ? `${student.firstName} ${student.lastName}` : 'Unknown'}</h3>
        <p className="text-sm text-gray-600 mt-1">Position: #{index + 1}</p>
        <div className="flex gap-2 mt-2">
          <Badge variant="warning">{entry.programLevel}</Badge>
          <Badge variant="info">Priority: {entry.priority}</Badge>
        </div>
      </div>

      <Button
        variant="danger"
        size="sm"
        onClick={() => onRemove(entry.id)}
      >
        Remove
      </Button>
    </motion.div>
  );
}
