import prisma from '@/lib/prisma';
import { buildFamilyDisplayName, normalizeEmail, normalizePhone } from '@/lib/family-utils';
import { normalizeGuardianInput, primaryGuardianLegacyData } from '@/lib/family-server';

export type PaidRegistrationChildInput = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  dateOfBirth?: string | null;
  courseId?: string | null;
  programId?: string | null;
  batchNumber?: number | null;
  sourceOptionText?: string | null;
  crmTag?: string | null;
  priceType?: 'FULL_PRICE' | 'SIBLING_DISCOUNT' | 'EARLY_BIRD';
  priceAmount?: number | null;
  existingStudentId?: string | null;
};

export type PaidGuardianInput = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  relationship?: 'PARENT' | 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';
};

export function requireText(value: unknown, field: string) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`${field} is required`);
  return text;
}

export function toOptionalText(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

export function toPositiveInt(value: unknown, fallback = 0) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
}

export async function findMatchingFamilies({
  email,
  phone,
  phoneCountryCode,
}: {
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
}) {
  const emailNormalized = normalizeEmail(email);
  const phoneNormalized = normalizePhone(phone);

  if (!emailNormalized && !phoneNormalized) return [];

  return prisma.family.findMany({
    where: {
      isArchived: false,
      guardians: {
        some: {
          OR: [
            ...(emailNormalized ? [{ emailNormalized }] : []),
            ...(phoneNormalized
              ? [{ phoneNormalized, phoneCountryCode: phoneCountryCode || 'NG' }]
              : []),
          ],
        },
      },
    },
    include: {
      guardians: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
      students: {
        include: {
          enrollments: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function ensurePaidFamily(
  tx: any,
  guardian: PaidGuardianInput,
  familyId?: string | null,
  options: { forceCreate?: boolean } = {}
) {
  if (familyId) {
    const family = await tx.family.findUnique({
      where: { id: familyId },
      include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
    });

    if (!family) throw new Error('Selected family was not found');
    return family;
  }

  const guardianData = normalizeGuardianInput({
    ...guardian,
    relationship: guardian.relationship || 'PARENT',
    isPrimary: true,
    isActive: true,
    needsReview: false,
  });

  const matched = options.forceCreate
    ? null
    : await tx.family.findFirst({
        where: {
          isArchived: false,
          guardians: {
            some: {
              OR: [
                ...(guardianData.emailNormalized ? [{ emailNormalized: guardianData.emailNormalized }] : []),
                ...(guardianData.phoneNormalized
                  ? [{ phoneNormalized: guardianData.phoneNormalized, phoneCountryCode: guardianData.phoneCountryCode || 'NG' }]
                  : []),
              ],
            },
          },
        },
        include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
      });

  if (matched) return matched;

  return tx.family.create({
    data: {
      displayName: buildFamilyDisplayName(null, guardianData.lastName),
      guardians: {
        create: {
          ...guardianData,
          isPrimary: true,
        },
      },
    },
    include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
  });
}

export async function ensurePaidStudent(
  tx: any,
  family: { id: string; guardians?: any[] },
  child: PaidRegistrationChildInput
) {
  if (child.existingStudentId) {
    const student = await tx.student.findUnique({ where: { id: child.existingStudentId } });
    if (!student) throw new Error('Selected student was not found');
    if (student.familyId !== family.id) throw new Error('Selected student does not belong to the chosen family');
    return student;
  }

  const firstName = requireText(child.firstName, 'Child first name');
  const lastName = requireText(child.lastName, 'Child last name');
  const dateOfBirth = child.dateOfBirth ? new Date(child.dateOfBirth) : null;
  const existing = await tx.student.findFirst({
    where: {
      familyId: family.id,
      firstName: { equals: firstName, mode: 'insensitive' },
      lastName: { equals: lastName, mode: 'insensitive' },
      ...(dateOfBirth ? { dateOfBirth } : {}),
    },
  });

  if (existing) return existing;

  const primaryGuardian = family.guardians?.find((guardian) => guardian.isPrimary) || family.guardians?.[0];

  return tx.student.create({
    data: {
      firstName,
      lastName,
      email: toOptionalText(child.email),
      phone: toOptionalText(child.phone),
      phoneCountryCode: child.phone ? child.phoneCountryCode || 'NG' : null,
      dateOfBirth,
      isReturningStudent: false,
      paymentStatus: 'CONFIRMED',
      familyId: family.id,
      ...primaryGuardianLegacyData(primaryGuardian),
    },
  });
}

export async function ensureConfirmedEnrollment(
  tx: any,
  {
    studentId,
    programId,
    batchNumber,
    priceType,
    priceAmount,
  }: {
    studentId: string;
    programId: string;
    batchNumber: number;
    priceType: 'FULL_PRICE' | 'SIBLING_DISCOUNT' | 'EARLY_BIRD';
    priceAmount: number;
  }
) {
  const existing = await tx.programEnrollment.findFirst({
    where: {
      studentId,
      programId,
      batchNumber,
      status: { not: 'DROPPED' },
    },
  });

  if (existing) {
    return tx.programEnrollment.update({
      where: { id: existing.id },
      data: {
        paymentStatus: 'CONFIRMED',
        priceType,
        priceAmount,
      },
    });
  }

  return tx.programEnrollment.create({
    data: {
      studentId,
      programId,
      batchNumber,
      status: 'WAITLIST',
      paymentStatus: 'CONFIRMED',
      priceType,
      priceAmount,
    },
  });
}
