import { describe, expect, it } from 'vitest';

import { buildParentDashboardViewModel } from '@/lib/parent-dashboard';

describe('parent dashboard view model', () => {
  it('returns only linked family data and strips internal fields', () => {
    const family = {
      id: 'family-1',
      displayName: 'Ada Family',
      crmContactId: 'private-crm-id',
      guardians: [
        {
          id: 'guardian-1',
          firstName: 'Ada',
          lastName: 'Okafor',
          relationship: 'MOTHER',
          isPrimary: true,
          email: 'parent@example.com',
          phone: '+234000000000',
        },
      ],
      students: [
        {
          id: 'student-1',
          firstName: 'Chidi',
          lastName: 'Okafor',
          dateOfBirth: new Date('2014-04-10T00:00:00.000Z'),
          isReturningStudent: true,
          email: 'private-student@example.com',
          attendanceRecords: [
            { status: 'PRESENT', session: { classId: 'class-1', heldAt: new Date('2026-08-20T14:00:00.000Z') } },
            { status: 'LATE', session: { classId: 'class-1', heldAt: new Date('2026-08-27T14:00:00.000Z') } },
          ],
          progressUpdates: [
            {
              classId: 'class-1',
              rating: 'ON_TRACK',
              summary: 'Chidi is building confidently with reusable components.',
              strengths: 'Explains his code clearly.',
              focusAreas: 'Test more edge cases.',
              createdAt: new Date('2026-08-27T16:00:00.000Z'),
              session: { title: 'Reusable components', heldAt: new Date('2026-08-27T14:00:00.000Z') },
            },
          ],
          enrollments: [
            {
              id: 'enrollment-1',
              batchNumber: 1,
              enrollmentDate: new Date('2026-08-01T00:00:00.000Z'),
              status: 'ASSIGNED',
              paymentStatus: 'CONFIRMED',
              paymentProofNote: 'internal payment note',
              paymentRecords: [
                { amountConfirmed: 25000, createdAt: new Date('2026-08-03T00:00:00.000Z'), storagePath: 'private/proof.pdf' },
                { amountConfirmed: 15000, createdAt: new Date('2026-08-02T00:00:00.000Z') },
              ],
              program: {
                id: 'program-1',
                name: 'Summer Coding',
                season: 'SUMMER',
                year: 2026,
                startDate: new Date('2026-08-10T00:00:00.000Z'),
              },
              class: {
                id: 'class-1',
                name: 'Robotics A',
                schedule: 'Saturdays at 10:00 AM',
                slot: '  SATURDAYS at 10:00 AM ',
                meetLink: 'https://meet.example/private',
                isArchived: true,
                course: { id: 'course-1', name: 'Robotics' },
                teacher: { firstName: 'Tola', lastName: 'Adewale' },
                sessions: [
                  {
                    title: 'Reusable components',
                    topics: 'Props and component composition',
                    summary: 'Learners built and reused a profile card.',
                    homework: 'Reuse the card for two more profiles.',
                    heldAt: new Date('2026-08-27T14:00:00.000Z'),
                  },
                ],
              },
            },
            {
              id: 'enrollment-2',
              batchNumber: 2,
              enrollmentDate: new Date('2026-08-04T00:00:00.000Z'),
              status: 'WAITLIST',
              paymentStatus: 'PENDING',
              paymentRecords: [],
              program: {
                id: 'program-2',
                name: 'AI Creators',
                season: 'OCTOBER',
                year: 2026,
                startDate: new Date('2026-10-03T00:00:00.000Z'),
              },
              class: null,
            },
            {
              id: 'enrollment-3',
              batchNumber: 1,
              enrollmentDate: new Date('2025-08-01T00:00:00.000Z'),
              status: 'COMPLETED',
              paymentStatus: 'COMPLETED',
              paymentRecords: [],
              program: {
                id: 'program-3',
                name: 'Past Program',
                season: 'SUMMER',
                year: 2025,
                startDate: new Date('2025-08-10T00:00:00.000Z'),
              },
              class: null,
            },
          ],
        },
      ],
    };

    const result = buildParentDashboardViewModel([
      { id: 'guardian-1', firstName: 'Ada', lastName: 'Okafor', family },
      { id: 'guardian-2', firstName: 'Ada', lastName: 'Okafor', family },
    ]);

    expect(result.summary).toEqual({
      familyCount: 1,
      childCount: 1,
      activeEnrollmentCount: 2,
      awaitingClassCount: 1,
      pendingPaymentCount: 1,
    });
    expect(result.families[0].children[0].enrollments[0]).toMatchObject({
      confirmedAmount: 40000,
      lastPaymentConfirmedAt: '2026-08-03T00:00:00.000Z',
      attendance: { total: 2, present: 1, late: 1, absent: 0, excused: 0 },
      latestProgressUpdate: {
        rating: 'ON_TRACK',
        summary: 'Chidi is building confidently with reusable components.',
        sessionTitle: 'Reusable components',
      },
      class: {
        meetLink: null,
        slot: null,
        tutorName: 'Tola Adewale',
        latestSession: { title: 'Reusable components', heldAt: '2026-08-27T14:00:00.000Z' },
      },
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('parent@example.com');
    expect(serialized).not.toContain('+234000000000');
    expect(serialized).not.toContain('private-student@example.com');
    expect(serialized).not.toContain('2014-04-10');
    expect(serialized).not.toContain('private-crm-id');
    expect(serialized).not.toContain('private/proof.pdf');
    expect(serialized).not.toContain('internal payment note');
  });
});
