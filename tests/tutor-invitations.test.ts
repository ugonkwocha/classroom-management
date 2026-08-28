import { describe, expect, it } from 'vitest';
import { buildInvitationUrl, canInviteRole, getInvitableRoles } from '@/lib/user-invitations';

describe('tutor invitations', () => {
  it('allows administrators to invite tutors but not parents or students', () => {
    expect(canInviteRole('SUPERADMIN', 'TUTOR')).toBe(true);
    expect(canInviteRole('ADMIN', 'TUTOR')).toBe(true);
    expect(canInviteRole('STAFF', 'TUTOR')).toBe(false);
    expect(canInviteRole('ADMIN', 'PARENT')).toBe(false);
    expect(getInvitableRoles('ADMIN')).toEqual(['STAFF', 'TUTOR']);
  });

  it('uses the supplied public origin even when an environment default exists', () => {
    expect(buildInvitationUrl('secure token', 'https://staging.9jacodekids.com')).toBe(
      'https://staging.9jacodekids.com/accept-invite?token=secure%20token'
    );
  });
});
