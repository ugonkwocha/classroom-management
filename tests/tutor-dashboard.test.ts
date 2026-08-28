import { describe, expect, it } from 'vitest';
import { buildTutorDashboardViewModel } from '@/lib/tutor-dashboard';

describe('tutor dashboard view model', () => {
  it('returns assigned teaching data without family, payment, or private student contacts', () => {
    const result = buildTutorDashboardViewModel({
      id: 'teacher-1',
      firstName: 'Chisom',
      lastName: 'Ikechukwu',
      email: 'tutor@example.com',
      phone: '+234-private',
      status: 'ACTIVE',
      classes: [
        {
          id: 'class-1',
          name: 'App Development 101',
          schedule: 'Saturday 9am',
          slot: 'Morning',
          batch: 1,
          meetLink: 'https://meet.example/class',
          course: { id: 'course-1', name: 'App Development 101' },
          program: { id: 'program-1', name: 'Summer', season: 'SUMMER', year: 2026 },
          _count: { sessions: 1 },
          enrollments: [
            {
              id: 'enrollment-1',
              paymentStatus: 'CONFIRMED',
              student: {
                id: 'student-1',
                firstName: 'Michael',
                lastName: 'Ugo-Nkwocha',
                isReturningStudent: false,
                email: 'private-child@example.com',
                family: { displayName: 'Private family' },
              },
            },
          ],
          sessions: [
            {
              id: 'session-1',
              heldAt: new Date('2026-08-28T14:00:00.000Z'),
              title: 'Navigation',
              topics: 'Links',
              summary: null,
              homework: null,
              status: 'COMPLETED',
              parentVisible: true,
              createdAt: new Date('2026-08-28T15:00:00.000Z'),
              attendance: [{ studentId: 'student-1', status: 'PRESENT', notes: null }],
              progressUpdates: [],
            },
          ],
        },
      ],
    });

    expect(result.summary).toEqual({
      classCount: 1,
      studentCount: 1,
      recordedSessionCount: 1,
      classesWithoutSessionCount: 0,
    });
    expect(result.classes[0].roster[0]).toEqual({
      enrollmentId: 'enrollment-1',
      id: 'student-1',
      firstName: 'Michael',
      lastName: 'Ugo-Nkwocha',
      isReturningStudent: false,
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('+234-private');
    expect(serialized).not.toContain('private-child@example.com');
    expect(serialized).not.toContain('Private family');
    expect(serialized).not.toContain('paymentStatus');
  });
});
