'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiMail, FiSend, FiUsers, FiX } from 'react-icons/fi';
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
  const [isRosterConfirmOpen, setIsRosterConfirmOpen] = useState(false);
  const [isSendingRoster, setIsSendingRoster] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Get students enrolled in this class
  const enrolledStudentIds = classData.students;
  const enrolledStudents = students.filter((student) =>
    enrolledStudentIds.includes(student.id)
  );

  // Get program info for this class
  const program = programs.find((p) => p.id === classData.programId);
  const tutorName = classData.teacher
    ? `${classData.teacher.firstName} ${classData.teacher.lastName}`.trim()
    : 'No tutor assigned';
  const tutorEmail = classData.teacher?.email || '';
  const rosterUnavailableReason = !classData.teacher
    ? 'Assign a tutor before sending the roster.'
    : !tutorEmail
      ? 'The assigned tutor does not have an email address.'
      : enrolledStudents.length === 0
        ? 'Assign at least one student before sending the roster.'
        : null;

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

  const handleSendTutorRoster = async () => {
    setIsSendingRoster(true);
    setMessage(null);

    try {
      const response = await fetchWithAuth('/api/emails/send-tutor-roster', {
        method: 'POST',
        body: JSON.stringify({ classId: classData.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send the tutor roster update.');
      }

      setIsRosterConfirmOpen(false);
      setMessage({
        type: 'success',
        text: `Current roster of ${data.rosterCount} student${data.rosterCount === 1 ? '' : 's'} emailed to ${data.tutorName}.`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send the tutor roster update.',
      });
    } finally {
      setIsSendingRoster(false);
    }
  };

  const confirmationDialog =
    isRosterConfirmOpen && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[70] bg-slate-950/60"
              onClick={() => !isSendingRoster && setIsRosterConfirmOpen(false)}
              aria-label="Close roster email confirmation"
            />
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tutor-roster-confirmation-title"
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              >
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                  <div>
                    <h3 id="tutor-roster-confirmation-title" className="text-lg font-bold text-slate-950">
                      Email current roster?
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      The server will fetch the latest assigned students before sending.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRosterConfirmOpen(false)}
                    disabled={isSendingRoster}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    aria-label="Close confirmation"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Tutor</p>
                    <p className="mt-1 font-bold text-slate-950">{tutorName}</p>
                    <p className="mt-1 text-sm text-slate-600">{tutorEmail}</p>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Class</dt>
                      <dd className="mt-1 font-semibold text-slate-800">{classData.name}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Students</dt>
                      <dd className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                        <FiUsers className="h-4 w-4 text-blue-600" />
                        {enrolledStudents.length} currently assigned
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRosterConfirmOpen(false)}
                    disabled={isSendingRoster}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSendTutorRoster}
                    disabled={isSendingRoster}
                    className="gap-2"
                  >
                    <FiSend className="h-4 w-4" />
                    {isSendingRoster ? 'Sending roster...' : 'Send roster email'}
                  </Button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <div className="space-y-4">
      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
          {message.text}
        </div>
      )}

      <div className={`p-4 rounded-lg border ${classData.isArchived ? 'bg-gray-50 border-gray-200' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'}`}>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900">{classData.name}</h3>
              {classData.isArchived && (
                <span className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800">ARCHIVED</span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Tutor: <span className="font-semibold text-slate-800">{tutorName}</span>
              {tutorEmail ? ` · ${tutorEmail}` : ''}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {enrolledStudents.length} student{enrolledStudents.length === 1 ? '' : 's'} currently assigned
            </p>
          </div>

          {canResendEmail && (
            <div className="sm:text-right">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRosterConfirmOpen(true)}
                disabled={Boolean(rosterUnavailableReason)}
                className="w-full gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 sm:w-auto"
                title={rosterUnavailableReason || 'Email the latest assigned student names to the tutor'}
              >
                <FiMail className="h-4 w-4" />
                Email current roster to tutor
              </Button>
              {rosterUnavailableReason && (
                <p className="mt-2 max-w-xs text-xs text-slate-500">{rosterUnavailableReason}</p>
              )}
            </div>
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

      {enrolledStudents.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="mb-2 text-gray-600">No students enrolled in this class yet.</p>
            <p className="text-sm text-gray-500">{classData.name}</p>
          </div>
        </Card>
      ) : (
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
      )}
      </div>
      {confirmationDialog}
    </>
  );
}
