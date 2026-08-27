import { describe, expect, it } from 'vitest';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

describe('portal role compatibility permissions', () => {
  it.each(['PARENT', 'TUTOR', 'STUDENT'] as const)(
    'does not grant %s access to the internal staff application',
    (role) => {
      expect(hasPermission(role, PERMISSIONS.VIEW_DASHBOARD)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.READ_STUDENTS)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.UPDATE_ENROLLMENT)).toBe(false);
    }
  );

  it('preserves existing staff dashboard access', () => {
    expect(hasPermission('STAFF', PERMISSIONS.VIEW_DASHBOARD)).toBe(true);
  });
});
