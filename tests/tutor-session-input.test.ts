import { describe, expect, it } from 'vitest';
import { parseTutorSessionInput, TutorSessionInputError } from '@/lib/tutor-session-input';

const baseInput = {
  heldAt: '2026-08-28T14:00:00.000Z',
  title: 'Navigation and links',
  topics: 'Semantic navigation and accessible links',
  summary: 'Learners built a working navigation bar.',
  homework: 'Add the navigation to the project homepage.',
  attendance: [
    { studentId: 'student-1', status: 'PRESENT' },
    { studentId: 'student-2', status: 'LATE', notes: 'Joined ten minutes late' },
  ],
  progressUpdates: [
    {
      studentId: 'student-1',
      rating: 'ON_TRACK',
      summary: 'Understands the purpose of semantic navigation.',
      parentVisible: true,
    },
  ],
};

describe('tutor class session input', () => {
  it('accepts a complete assigned-class attendance and progress record', () => {
    const result = parseTutorSessionInput(baseInput, ['student-1', 'student-2']);

    expect(result.heldAt.toISOString()).toBe(baseInput.heldAt);
    expect(result.attendance).toHaveLength(2);
    expect(result.progressUpdates[0]).toMatchObject({
      studentId: 'student-1',
      rating: 'ON_TRACK',
      parentVisible: true,
    });
  });

  it('requires attendance for every currently assigned learner', () => {
    expect(() =>
      parseTutorSessionInput(
        { ...baseInput, attendance: baseInput.attendance.slice(0, 1) },
        ['student-1', 'student-2']
      )
    ).toThrowError(TutorSessionInputError);
  });

  it('rejects attendance or progress for a learner outside the assigned class', () => {
    expect(() =>
      parseTutorSessionInput(
        {
          ...baseInput,
          attendance: [{ studentId: 'student-3', status: 'PRESENT' }],
          progressUpdates: [],
        },
        ['student-1']
      )
    ).toThrow('Attendance must be recorded for every currently assigned student');

    expect(() =>
      parseTutorSessionInput(
        {
          ...baseInput,
          attendance: [{ studentId: 'student-1', status: 'PRESENT' }],
          progressUpdates: [{ studentId: 'student-3', rating: 'ON_TRACK', summary: 'No access' }],
        },
        ['student-1']
      )
    ).toThrow('Progress updates are limited to assigned students');
  });
});
