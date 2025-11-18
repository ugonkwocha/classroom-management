'use client';

import { Class, Student, Program } from '@/types';
import { Card, Button } from '@/components/ui';

interface ClassStudentsModalProps {
  classData: Class;
  students: Student[];
  programs: Program[];
}

export function ClassStudentsModal({ classData, students, programs }: ClassStudentsModalProps) {
  // Get students enrolled in this class
  const enrolledStudentIds = classData.students;
  const enrolledStudents = students.filter((student) =>
    enrolledStudentIds.includes(student.id)
  );

  // Get program info for this class
  const program = programs.find((p) => p.id === classData.programId);

  // Helper function to get student's enrollment info for this class
  const getEnrollmentInfo = (student: Student) => {
    return student.programEnrollments?.find((e) => e.classId === classData.id);
  };

  if (enrolledStudents.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">No students enrolled in this class yet.</p>
          <p className="text-sm text-gray-500">{classData.name}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg border ${classData.isArchived ? 'bg-gray-50 border-gray-200' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'}`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-gray-900">{classData.name}</h3>
          {classData.isArchived && (
            <span className="text-xs font-semibold px-2 py-1 bg-gray-200 text-gray-800 rounded">ARCHIVED</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-600 font-semibold">Capacity</p>
            <p className="text-gray-900">{enrolledStudents.length} / {classData.capacity}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-semibold">Program</p>
            <p className="text-gray-900">{program ? `${program.name} - ${program.season} ${program.year}` : 'Unknown'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {enrolledStudents.map((student) => {
          const enrollment = getEnrollmentInfo(student);
          const paymentStatusColor =
            enrollment?.paymentStatus === 'COMPLETED'
              ? 'text-green-600'
              : enrollment?.paymentStatus === 'CONFIRMED'
              ? 'text-blue-600'
              : 'text-amber-600';

          const statusLabel =
            enrollment?.paymentStatus === 'COMPLETED'
              ? 'Completed'
              : enrollment?.paymentStatus === 'CONFIRMED'
              ? 'Confirmed'
              : 'Pending';

          return (
            <Card key={student.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{student.email}</p>
                  <p className="text-sm text-gray-600">{student.phone}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-semibold ${paymentStatusColor}`}>{statusLabel}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {student.isReturningStudent ? '🔄 Returning' : '🆕 New'}
                  </p>
                </div>
              </div>

              {enrollment && (
                <div className="pt-3 border-t border-gray-200 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enrollment Date:</span>
                    <span className="text-gray-900">{new Date(enrollment.enrollmentDate).toLocaleDateString()}</span>
                  </div>
                  {enrollment.batchNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Batch:</span>
                      <span className="text-gray-900">{enrollment.batchNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className={paymentStatusColor}>{statusLabel}</span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
