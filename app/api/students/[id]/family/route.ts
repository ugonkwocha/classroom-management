import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { primaryGuardianLegacyData, studentFamilyInclude } from '@/lib/family-server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_STUDENT);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const { familyId } = await request.json();
    const family = familyId
      ? await prisma.family.findUnique({
          where: { id: familyId },
          include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
        })
      : null;

    if (familyId && !family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    const primary = family?.guardians.find((guardian) => guardian.isPrimary) || family?.guardians[0] || null;
    const student = await prisma.student.update({
      where: { id: params.id },
      data: {
        familyId: familyId || null,
        ...(primary ? primaryGuardianLegacyData(primary) : {}),
      },
      include: {
        ...studentFamilyInclude,
        enrollments: {
          include: {
            class: true,
            program: true,
          },
        },
        courseHistory: true,
      },
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error updating student family:', error);
    return NextResponse.json({ error: 'Failed to update student family' }, { status: 500 });
  }
}
