import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { familyInclude, primaryGuardianLegacyData } from '@/lib/family-server';

function guardianKey(guardian: { emailNormalized?: string | null; phoneNormalized?: string | null; phoneCountryCode?: string | null }) {
  if (guardian.emailNormalized) return `email:${guardian.emailNormalized}`;
  if (guardian.phoneNormalized) return `phone:${guardian.phoneCountryCode || 'NG'}:${guardian.phoneNormalized}`;
  return '';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.MERGE_FAMILY);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const { sourceFamilyId } = await request.json();
    const destinationFamilyId = params.id;

    if (!sourceFamilyId || sourceFamilyId === destinationFamilyId) {
      return NextResponse.json({ error: 'Choose a different source family to merge' }, { status: 400 });
    }

    const mergedFamily = await prisma.$transaction(async (tx) => {
      const destination = await tx.family.findUnique({
        where: { id: destinationFamilyId },
        include: { guardians: true },
      });
      const source = await tx.family.findUnique({
        where: { id: sourceFamilyId },
        include: { guardians: true },
      });

      if (!destination || !source) throw new Error('Family not found');

      const existingKeys = new Set(destination.guardians.map(guardianKey).filter(Boolean));
      for (const guardian of source.guardians) {
        const key = guardianKey(guardian);
        if (key && existingKeys.has(key)) continue;

        await tx.parentGuardian.create({
          data: {
            familyId: destinationFamilyId,
            firstName: guardian.firstName,
            lastName: guardian.lastName,
            email: guardian.email,
            emailNormalized: guardian.emailNormalized,
            phone: guardian.phone,
            phoneNormalized: guardian.phoneNormalized,
            phoneCountryCode: guardian.phoneCountryCode,
            relationship: guardian.relationship,
            isPrimary: false,
            isActive: guardian.isActive,
            needsReview: guardian.needsReview,
          },
        });
        if (key) existingKeys.add(key);
      }

      await tx.student.updateMany({
        where: { familyId: sourceFamilyId },
        data: { familyId: destinationFamilyId },
      });
      await tx.family.update({
        where: { id: sourceFamilyId },
        data: { isArchived: true },
      });

      const updatedDestination = await tx.family.findUnique({
        where: { id: destinationFamilyId },
        include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
      });
      const primary = updatedDestination?.guardians.find((guardian) => guardian.isPrimary)
        || updatedDestination?.guardians[0];

      if (primary) {
        await tx.student.updateMany({
          where: { familyId: destinationFamilyId },
          data: primaryGuardianLegacyData(primary),
        });
      }

      return tx.family.findUnique({
        where: { id: destinationFamilyId },
        include: familyInclude,
      });
    });

    return NextResponse.json(mergedFamily);
  } catch (error) {
    console.error('Error merging families:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to merge families' },
      { status: 500 }
    );
  }
}
