'use client';

import { useWaitlist, useStudents, useClasses } from '@/lib/hooks';
import { Card, Button, Badge } from '@/components/ui';
import { assignStudentsToClasses, promoteFromWaitlist } from '@/lib/assignment';
import { WaitlistCard } from './WaitlistCard';
import { AnimatePresence } from 'framer-motion';

export function WaitlistManagement() {
  const { waitlist, isLoaded, removeFromWaitlist } = useWaitlist();
  const { students } = useStudents();
  const { classes, updateClass } = useClasses();

  const handleAutoAssign = () => {
    const promoted = promoteFromWaitlist(classes, waitlist, students);

    promoted.forEach(({ studentId, classId }) => {
      const classData = classes.find((c) => c.id === classId);
      if (classData) {
        updateClass(classId, {
          students: [...classData.students, studentId],
        });
        removeFromWaitlist(waitlist.find((w) => w.studentId === studentId)?.id || '');
      }
    });
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  const sortedWaitlist = [...waitlist].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Waitlist</h2>
        {waitlist.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAutoAssign}
          >
            Auto-Assign Available Spots
          </Button>
        )}
      </div>

      {waitlist.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No students on waitlist</p>
          </div>
        </Card>
      ) : (
        <Card className="space-y-3">
          <div className="mb-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-800 font-semibold">
              {waitlist.length} student{waitlist.length !== 1 ? 's' : ''} waiting for placement
            </p>
          </div>

          <AnimatePresence mode="popLayout">
            {sortedWaitlist.map((entry, index) => {
              const student = students.find((s) => s.id === entry.studentId);
              return (
                <WaitlistCard
                  key={entry.id}
                  entry={entry}
                  student={student}
                  onRemove={removeFromWaitlist}
                  index={index}
                />
              );
            })}
          </AnimatePresence>
        </Card>
      )}
    </div>
  );
}
