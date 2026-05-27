import prisma from '@/lib/prisma';
import { buildFamilyDisplayName, normalizeEmail, normalizePhone } from '@/lib/family-utils';

type GuardianInput = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  relationship?: 'PARENT' | 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';
  isPrimary?: boolean;
  isActive?: boolean;
  needsReview?: boolean;
};

export const familyInclude = {
  guardians: {
    orderBy: [
      { isPrimary: 'desc' as const },
      { createdAt: 'asc' as const },
    ],
  },
  students: {
    include: {
      enrollments: {
        include: {
          class: true,
          program: true,
        },
      },
      courseHistory: true,
    },
    orderBy: [
      { lastName: 'asc' as const },
      { firstName: 'asc' as const },
    ],
  },
};

export const studentFamilyInclude = {
  family: {
    include: {
      guardians: {
        orderBy: [
          { isPrimary: 'desc' as const },
          { createdAt: 'asc' as const },
        ],
      },
    },
  },
};

export function getPrimaryGuardian<T extends { guardians?: GuardianInput[] }>(family?: T | null) {
  return family?.guardians?.find((guardian) => guardian.isPrimary && guardian.isActive !== false)
    || family?.guardians?.find((guardian) => guardian.isActive !== false)
    || family?.guardians?.[0]
    || null;
}

export function normalizeGuardianInput(guardian: GuardianInput) {
  const email = guardian.email?.trim() || null;
  const phone = guardian.phone?.trim() || null;
  return {
    firstName: guardian.firstName?.trim() || 'Parent',
    lastName: guardian.lastName?.trim() || 'Guardian',
    email,
    emailNormalized: email ? normalizeEmail(email) : null,
    phone,
    phoneNormalized: phone ? normalizePhone(phone) : null,
    phoneCountryCode: phone ? guardian.phoneCountryCode || 'NG' : null,
    relationship: guardian.relationship || 'PARENT',
    isPrimary: guardian.isPrimary ?? false,
    isActive: guardian.isActive ?? true,
    needsReview: guardian.needsReview ?? false,
  };
}

export function primaryGuardianLegacyData(guardian: GuardianInput | null | undefined) {
  return {
    parentEmail: guardian?.email || null,
    parentPhone: guardian?.phone || null,
    parentPhoneCountryCode: guardian?.phone ? guardian.phoneCountryCode || 'NG' : null,
  };
}

export async function ensureFamilyForStudentInput(data: any, tx: typeof prisma = prisma) {
  if (data.familyId) {
    const family = await tx.family.findUnique({
      where: { id: data.familyId },
      include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
    });

    if (!family) {
      throw new Error('Selected family was not found');
    }

    return family;
  }

  const guardianInput = {
    firstName: data.parentFirstName,
    lastName: data.parentLastName,
    email: data.parentEmail,
    phone: data.parentPhone,
    phoneCountryCode: data.parentPhoneCountryCode,
    relationship: data.parentRelationship || 'PARENT',
    isPrimary: true,
    isActive: true,
    needsReview: false,
  };

  if (!guardianInput.firstName?.trim() || !guardianInput.lastName?.trim()) {
    throw new Error('Parent/guardian first and last name are required');
  }

  const guardianData = normalizeGuardianInput(guardianInput);
  if (!guardianData.email && !guardianData.phone) {
    throw new Error('Parent/guardian email or phone is required');
  }

  const family = await tx.family.create({
    data: {
      displayName: data.familyDisplayName?.trim()
        || buildFamilyDisplayName(data.lastName, guardianData.lastName),
      guardians: {
        create: {
          ...guardianData,
          isPrimary: true,
        },
      },
    },
    include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
  });

  return family;
}
