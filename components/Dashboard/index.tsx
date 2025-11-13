'use client';

import { useState } from 'react';
import { useStudents, useClasses, useWaitlist } from '@/lib/hooks';
import { Card, Button, Modal } from '@/components/ui';
import { StatCard } from './StatCard';
import { assignStudentsToClasses, calculateWaitlistPriority } from '@/lib/assignment';
import { calculateAge } from '@/lib/utils';

export function Dashboard() {
  const { students, isLoaded: studentsLoaded, updateStudent } = useStudents();
  const { classes, isLoaded: classesLoaded, updateClass } = useClasses();
  const { waitlist, isLoaded: waitlistLoaded, addToWaitlist, removeFromWaitlist } = useWaitlist();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<{ assigned: number; waitlisted: number }>({ assigned: 0, waitlisted: 0 });

  const handleAutoAssign = () => {
    const result = assignStudentsToClasses(students, classes, waitlist);

    // Apply assignments
    result.assigned.forEach(({ studentId, classId }) => {
      updateStudent(studentId, { classId });
      const classData = classes.find((c) => c.id === classId);
      if (classData) {
        updateClass(classId, {
          students: [...classData.students, studentId],
        });
      }
    });

    // Add to waitlist
    result.waitlisted.forEach(({ studentId, programLevel }) => {
      const student = students.find((s) => s.id === studentId);
      if (student && !waitlist.find((w) => w.studentId === studentId)) {
        const priority = calculateWaitlistPriority(student, undefined, waitlist);
        addToWaitlist({
          studentId,
          programLevel: programLevel as any,
          priority,
          timestamp: new Date().toISOString(),
        });
      }
    });

    setAssignmentResult({
      assigned: result.assigned.length,
      waitlisted: result.waitlisted.length,
    });
    setIsModalOpen(true);
  };

  if (!studentsLoaded || !classesLoaded || !waitlistLoaded) {
    return <div>Loading...</div>;
  }

  const totalStudents = students.length;
  const totalClasses = classes.length;

  // Calculate actual enrolled students (respecting capacity limits)
  let totalEnrolled = 0;
  classes.forEach((cls) => {
    const enrolledInClass = students.filter((s) => s.classId === cls.id).length;
    totalEnrolled += Math.min(enrolledInClass, cls.capacity);
  });

  const waitlistCount = waitlist.length;
  const totalCapacity = classes.reduce((sum, cls) => sum + cls.capacity, 0);
  const capacityPercentage = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  // Group students by program
  const programDistribution = {
    'AI Explorers': students.filter((s) => s.programLevel === 'AI Explorers').length,
    'AI Creators': students.filter((s) => s.programLevel === 'AI Creators').length,
    'AI Innovators': students.filter((s) => s.programLevel === 'AI Innovators').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={totalStudents}
          subtext={`${totalEnrolled} enrolled`}
          variant="primary"
        />
        <StatCard
          label="Total Classes"
          value={totalClasses}
          subtext={`${totalCapacity} capacity`}
          variant="success"
        />
        <StatCard
          label="Enrollment Rate"
          value={`${capacityPercentage}%`}
          subtext={`${totalEnrolled}/${totalCapacity} spots filled`}
          variant={capacityPercentage < 50 ? 'success' : capacityPercentage < 100 ? 'warning' : 'danger'}
        />
        <StatCard
          label="Waitlist"
          value={waitlistCount}
          subtext="Waiting for placement"
          variant={waitlistCount > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Program Distribution */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Program Distribution</h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(programDistribution).map(([program, count]) => (
            <div key={program} className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{program}</p>
              <p className="text-2xl font-bold text-purple-600">{count}</p>
              <p className="text-xs text-gray-500 mt-2">
                {Math.round((count / totalStudents) * 100) || 0}% of students
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Auto-Assign Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Auto-Assign Students</h2>
            <p className="text-sm text-gray-600 mt-1">
              Automatically assign all unassigned students to appropriate classes
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleAutoAssign}
            disabled={students.filter((s) => !s.classId).length === 0}
          >
            Run Auto-Assign
          </Button>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-gray-900 mb-3">Unassigned Students</h3>
          <p className="text-3xl font-bold text-purple-600">
            {students.filter((s) => !s.classId).length}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Pending assignment to classes
          </p>
        </Card>

        <Card>
          <h3 className="font-bold text-gray-900 mb-3">Class Availability</h3>
          <p className="text-3xl font-bold text-green-600">
            {classes.filter((c) => c.students.length < c.capacity).length}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Classes with available spots
          </p>
        </Card>
      </div>

      {/* Assignment Result Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Auto-Assignment Complete">
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-bold">{assignmentResult.assigned}</span> students assigned to classes
            </p>
          </div>
          {assignmentResult.waitlisted > 0 && (
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                <span className="font-bold">{assignmentResult.waitlisted}</span> students added to waitlist
              </p>
            </div>
          )}
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(false)}
            className="w-full"
          >
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}
