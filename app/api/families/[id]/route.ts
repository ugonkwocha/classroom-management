import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { familyInclude, normalizeGuardianInput, primaryGuardianLegacyData } from '@/lib/family-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.READ_FAMILIES);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const family = await prisma.family.findUnique({
      where: { id: params.id },
      include: familyInclude,
    });

    if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    return NextResponse.json(family);
  } catch (error) {
    console.error('Error fetching family:', error);
    return NextResponse.json({ error: 'Failed to fetch family' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_FAMILY);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const data = await request.json();
    const family = await prisma.$transaction(async (tx) => {
      await tx.family.update({
        where: { id: params.id },
        data: {
          ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
          ...(data.isArchived !== undefined ? { isArchived: Boolean(data.isArchived) } : {}),
        },
      });

      if (Array.isArray(data.guardians)) {
        const normalizedGuardians = data.guardians.map(normalizeGuardianInput);
        const primaryCount = normalizedGuardians.filter((guardian: any) => guardian.isPrimary).length;
        if (primaryCount === 0 && normalizedGuardians.length > 0) normalizedGuardians[0].isPrimary = true;

        await tx.parentGuardian.deleteMany({ where: { familyId: params.id } });
        await tx.parentGuardian.createMany({
          data: normalizedGuardians.map((guardian: any) => ({
            ...guardian,
            familyId: params.id,
          })),
        });

        const primary = normalizedGuardians.find((guardian: any) => guardian.isPrimary) || normalizedGuardians[0];
        if (primary) {
          await tx.student.updateMany({
            where: { familyId: params.id },
            data: primaryGuardianLegacyData(primary),
          });
        }
      }

      return tx.family.findUnique({ where: { id: params.id }, include: familyInclude });
    });

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error updating family:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update family' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.DELETE_FAMILY);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const studentCount = await prisma.student.count({ where: { familyId: params.id } });
    if (studentCount > 0) {
      return NextResponse.json(
        { error: 'Only empty families can be deleted. Move or delete students first.' },
        { status: 400 }
      );
    }

    await prisma.family.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, deletedFamilyId: params.id });
  } catch (error) {
    console.error('Error deleting family:', error);
    return NextResponse.json({ error: 'Failed to delete family' }, { status: 500 });
  }
}
