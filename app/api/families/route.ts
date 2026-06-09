import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { familyInclude, normalizeGuardianInput, primaryGuardianLegacyData } from '@/lib/family-server';
import { normalizeEmail, normalizePhone } from '@/lib/family-utils';

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.READ_FAMILIES);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const normalizedEmail = normalizeEmail(search);
    const normalizedPhone = normalizePhone(search);
    const shouldSearchContact = Boolean(search && (search.length >= 3 || search.includes('@') || normalizedPhone.length >= 3));
    const shouldSearchPhone = normalizedPhone.length >= 3;
    const searchTerms = search
      ? search
          .split(/\s+/)
          .map((term) => term.trim())
          .filter(Boolean)
      : [];
    const textSearchFields = search
      ? [
          { displayName: { contains: search, mode: 'insensitive' as const } },
          { guardians: { some: { firstName: { contains: search, mode: 'insensitive' as const } } } },
          { guardians: { some: { lastName: { contains: search, mode: 'insensitive' as const } } } },
          { students: { some: { firstName: { contains: search, mode: 'insensitive' as const } } } },
          { students: { some: { lastName: { contains: search, mode: 'insensitive' as const } } } },
          { paymentRecords: { some: { student: { firstName: { contains: search, mode: 'insensitive' as const } } } } },
          { paymentRecords: { some: { student: { lastName: { contains: search, mode: 'insensitive' as const } } } } },
          { confirmedRegistrationImports: { some: { parentFirstName: { contains: search, mode: 'insensitive' as const } } } },
          { confirmedRegistrationImports: { some: { parentLastName: { contains: search, mode: 'insensitive' as const } } } },
          { confirmedRegistrationImports: { some: { parentEmail: { contains: search, mode: 'insensitive' as const } } } },
          { confirmedRegistrationImports: { some: { children: { some: { firstName: { contains: search, mode: 'insensitive' as const } } } } } },
          { confirmedRegistrationImports: { some: { children: { some: { lastName: { contains: search, mode: 'insensitive' as const } } } } } },
        ]
      : [];
    const tokenSearchFields = searchTerms.flatMap((term) => [
      { displayName: { contains: term, mode: 'insensitive' as const } },
      { guardians: { some: { firstName: { contains: term, mode: 'insensitive' as const } } } },
      { guardians: { some: { lastName: { contains: term, mode: 'insensitive' as const } } } },
      { students: { some: { firstName: { contains: term, mode: 'insensitive' as const } } } },
      { students: { some: { lastName: { contains: term, mode: 'insensitive' as const } } } },
      { paymentRecords: { some: { student: { firstName: { contains: term, mode: 'insensitive' as const } } } } },
      { paymentRecords: { some: { student: { lastName: { contains: term, mode: 'insensitive' as const } } } } },
      { confirmedRegistrationImports: { some: { parentFirstName: { contains: term, mode: 'insensitive' as const } } } },
      { confirmedRegistrationImports: { some: { parentLastName: { contains: term, mode: 'insensitive' as const } } } },
      { confirmedRegistrationImports: { some: { children: { some: { firstName: { contains: term, mode: 'insensitive' as const } } } } } },
      { confirmedRegistrationImports: { some: { children: { some: { lastName: { contains: term, mode: 'insensitive' as const } } } } } },
    ]);

    const families = await prisma.family.findMany({
      where: {
        ...(search ? {} : { isArchived: false }),
        ...(search
          ? {
              OR: [
                ...textSearchFields,
                ...tokenSearchFields,
                ...(shouldSearchContact && normalizedEmail
                  ? [{ guardians: { some: { emailNormalized: { contains: normalizedEmail } } } }]
                  : []),
                ...(shouldSearchPhone
                  ? [{ guardians: { some: { phoneNormalized: { contains: normalizedPhone } } } }]
                  : []),
              ],
            }
          : {}),
      },
      include: familyInclude,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(families);
  } catch (error) {
    console.error('Error fetching families:', error);
    return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.CREATE_FAMILY);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const data = await request.json();
    const guardians = (data.guardians || []).map(normalizeGuardianInput);

    if (guardians.length === 0) {
      return NextResponse.json(
        { error: 'At least one parent/guardian is required' },
        { status: 400 }
      );
    }

    if (guardians.some((guardian: any) => !guardian.firstName || !guardian.lastName)) {
      return NextResponse.json(
        { error: 'Parent/guardian first and last names are required' },
        { status: 400 }
      );
    }

    const hasPrimary = guardians.some((guardian: any) => guardian.isPrimary);
    if (!hasPrimary) guardians[0].isPrimary = true;

    const family = await prisma.$transaction(async (tx) => {
      const createdFamily = await tx.family.create({
        data: {
          displayName: data.displayName?.trim() || `${guardians[0].lastName} Family`,
          guardians: { create: guardians },
        },
        include: familyInclude,
      });

      const primary = createdFamily.guardians.find((guardian) => guardian.isPrimary) || createdFamily.guardians[0];
      if (Array.isArray(data.studentIds) && data.studentIds.length > 0) {
        await tx.student.updateMany({
          where: { id: { in: data.studentIds } },
          data: {
            familyId: createdFamily.id,
            ...primaryGuardianLegacyData(primary),
          },
        });
      }

      return tx.family.findUnique({
        where: { id: createdFamily.id },
        include: familyInclude,
      });
    });

    return NextResponse.json(family, { status: 201 });
  } catch (error) {
    console.error('Error creating family:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create family' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.DELETE_FAMILY);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const deleted = await prisma.family.deleteMany({
      where: {
        students: {
          none: {},
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedFamilies: deleted.count,
    });
  } catch (error) {
    console.error('Error deleting empty families:', error);
    return NextResponse.json({ error: 'Failed to delete empty families' }, { status: 500 });
  }
}
