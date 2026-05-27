export function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || '';
}

export function normalizePhone(value?: string | null) {
  return value?.replace(/\D/g, '') || '';
}

export function formatGuardianName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

export function buildFamilyDisplayName(studentLastName?: string | null, guardianLastName?: string | null) {
  const lastName = studentLastName || guardianLastName;
  return lastName ? `${lastName} Family` : 'Family';
}
