export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;
export const PROGRESS_RATINGS = ['EXCEEDING', 'ON_TRACK', 'NEEDS_SUPPORT'] as const;
export const SESSION_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;

export class TutorSessionInputError extends Error {}

export function parseTutorSessionInput(body: any, eligibleStudentIds: string[]) {
  const heldAt = new Date(String(body.heldAt || ''));
  const title = String(body.title || '').trim();
  const topics = String(body.topics || '').trim();
  const summary = String(body.summary || '').trim() || null;
  const homework = String(body.homework || '').trim() || null;
  const status = String(body.status || 'COMPLETED');
  const attendanceInput = Array.isArray(body.attendance) ? body.attendance : [];
  const progressInput = Array.isArray(body.progressUpdates) ? body.progressUpdates : [];

  if (Number.isNaN(heldAt.getTime())) throw new TutorSessionInputError('A valid session date and time is required');
  if (!title || title.length > 120) throw new TutorSessionInputError('Session title is required and must be 120 characters or less');
  if (!topics || topics.length > 2000) throw new TutorSessionInputError('Topics covered are required and must be 2,000 characters or less');
  if (summary && summary.length > 5000) throw new TutorSessionInputError('Lesson summary must be 5,000 characters or less');
  if (homework && homework.length > 3000) throw new TutorSessionInputError('Homework must be 3,000 characters or less');
  if (!SESSION_STATUSES.includes(status as any)) throw new TutorSessionInputError('Invalid session status');

  const eligible = new Set(eligibleStudentIds);
  const attendanceIds = attendanceInput.map((item: any) => String(item.studentId || ''));
  if (new Set(attendanceIds).size !== attendanceIds.length) {
    throw new TutorSessionInputError('Each student can have only one attendance record per session');
  }
  if (attendanceIds.length !== eligible.size || attendanceIds.some((id: string) => !eligible.has(id))) {
    throw new TutorSessionInputError('Attendance must be recorded for every currently assigned student');
  }

  const attendance = attendanceInput.map((item: any) => {
    const attendanceStatus = String(item.status || '');
    if (!ATTENDANCE_STATUSES.includes(attendanceStatus as any)) {
      throw new TutorSessionInputError('Invalid attendance status');
    }
    const notes = String(item.notes || '').trim() || null;
    if (notes && notes.length > 500) throw new TutorSessionInputError('Attendance notes must be 500 characters or less');
    return { studentId: String(item.studentId), status: attendanceStatus, notes };
  });

  const progressIds = progressInput.map((item: any) => String(item.studentId || ''));
  if (new Set(progressIds).size !== progressIds.length) {
    throw new TutorSessionInputError('Each student can have only one progress update per session');
  }

  const progressUpdates = progressInput.map((item: any) => {
    const studentId = String(item.studentId || '');
    const rating = String(item.rating || '');
    const progressSummary = String(item.summary || '').trim();
    const strengths = String(item.strengths || '').trim() || null;
    const focusAreas = String(item.focusAreas || '').trim() || null;
    if (!eligible.has(studentId)) throw new TutorSessionInputError('Progress updates are limited to assigned students');
    if (!PROGRESS_RATINGS.includes(rating as any)) throw new TutorSessionInputError('Invalid progress rating');
    if (!progressSummary || progressSummary.length > 2000) {
      throw new TutorSessionInputError('Progress summary is required and must be 2,000 characters or less');
    }
    if (strengths && strengths.length > 1000) throw new TutorSessionInputError('Strengths must be 1,000 characters or less');
    if (focusAreas && focusAreas.length > 1000) throw new TutorSessionInputError('Focus areas must be 1,000 characters or less');
    return {
      studentId,
      rating,
      summary: progressSummary,
      strengths,
      focusAreas,
      parentVisible: item.parentVisible !== false,
    };
  });

  return {
    heldAt,
    title,
    topics,
    summary,
    homework,
    status,
    parentVisible: body.parentVisible !== false,
    attendance,
    progressUpdates,
  };
}
