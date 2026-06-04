'use client';

import { useState } from 'react';
import { Class, Student, Program } from '@/types';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { normalizePaymentStatus } from '@/lib/student-payment-status';

interface ClassStudentsModalProps {
  classData: Class;
  students: Student[];
  programs: Program[];
}

function formatResendMessage(data: any) {
  const parentsSent = data.parentsSent ?? data.emailsSent?.parents ?? 0;
  const studentsSent = data.studentsSent ?? data.emailsSent?.students ?? 0;
  const parentsFailed = data.parentsFailed ?? data.emailsFailed?.parents ?? 0;
  const studentsFailed = data.studentsFailed ?? data.emailsFailed?.students ?? 0;
  const sentParts = [
    parentsSent ? `${parentsSent} parent${parentsSent === 1 ? '' : 's'}` : '',
    studentsSent ? `${studentsSent} student${studentsSent === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  const failedCount = parentsFailed + studentsFailed;

  if (data.success) {
    return sentParts.length ? `Assignment email resent to ${sentParts.join(' and ')}.` : 'Assignment email resend completed.';
  }

  return `${data.error || data.notification?.error || 'Assignment email resend did not complete.'}${failedCount ? ` Failed recipients: ${failedCount}.` : ''}`;
}

export function ClassStudentsModal({ classData, students, programs }: ClassStudentsModalProps) {
  const { hasPermission } = useAuth();
  const canResendEmail = hasPermission(PERMISSIONS.RESEND_EMAIL);
  const [resendingStudentId, setResendingStudentId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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

  const handleResendAssignmentEmail = async (student: Student) => {
    const enrollment = getEnrollmentInfo(student);
    if (!enrollment) {
      setMessage({ type: 'error', text: 'This student does not have an active enrollment for this class.' });
      return;
    }

    setResendingStudentId(student.id);
    setMessage(null);

    try {
      const response = await fetchWithAuth('/api/emails/send-enrollment', {
        method: 'POST',
        body: JSON.stringify({
          studentId: student.id,
          classId: classData.id,
          enrollmentId: enrollment.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend assignment email');
      }

      setMessage({
        type: data.success ? 'success' : 'error',
        text: formatResendMessage(data),
      });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to resend assignment email' });
    } finally {
      setResendingStudentId(null);
    }
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
      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
          {message.text}
        </div>
      )}

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
        {classData.meetLink && (
          <div className="mt-3 pt-3 border-t border-purple-200">
            <p className="text-xs text-gray-600 font-semibold">Google Meet Link</p>
            <a
              href={classData.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-700 hover:text-purple-900 break-all"
            >
              {classData.meetLink}
            </a>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {enrolledStudents.map((student) => {
          const enrollment = getEnrollmentInfo(student);
          const paymentStatus = normalizePaymentStatus(enrollment?.paymentStatus);
          const paymentStatusColor =
            paymentStatus === 'CONFIRMED'
              ? 'text-blue-600'
              : 'text-amber-600';

          const statusLabel =
            paymentStatus === 'CONFIRMED'
              ? 'Confirmed'
              : 'Pending';

          return (
            <Card key={student.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{student.email || 'No email'}</p>
                  <p className="text-sm text-gray-600">{student.phone || 'No phone'}</p>
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
                  {canResendEmail && enrollment.status === 'ASSIGNED' && (
                    <div className="pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendAssignmentEmail(student)}
                        disabled={resendingStudentId === student.id}
                        className="w-full text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        {resendingStudentId === student.id ? 'Resending...' : 'Resend assignment email'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
