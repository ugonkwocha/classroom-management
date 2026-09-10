import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { normalizeEmail, normalizePhone } from '@/lib/family-utils';
import { searchExternalRegistrations } from '@/lib/wordpress-registrations';
import { findMatchingFamilies } from '@/lib/paid-registration-utils';
import { resolveExternalRegistrationLookup } from '@/lib/returning-customer-search';

function familySearchWhere(query: string) {
  const terms = query.split(/\s+/).map((term) => term.trim()).filter(Boolean);
  const email = normalizeEmail(query);
  const phone = normalizePhone(query);

  return {
    OR: [
      { displayName: { contains: query, mode: 'insensitive' as const } },
      ...terms.flatMap((term) => [
        { guardians: { some: { firstName: { contains: term, mode: 'insensitive' as const } } } },
        { guardians: { some: { lastName: { contains: term, mode: 'insensitive' as const } } } },
        { students: { some: { firstName: { contains: term, mode: 'insensitive' as const } } } },
        { students: { some: { lastName: { contains: term, mode: 'insensitive' as const } } } },
      ]),
      ...(query.includes('@') ? [{ guardians: { some: { emailNormalized: { contains: email } } } }] : []),
      ...(query.includes('@') ? [
        { students: { some: { email: { contains: query, mode: 'insensitive' as const } } } },
        { students: { some: { parentEmail: { contains: query, mode: 'insensitive' as const } } } },
      ] : []),
      ...(phone.length >= 5 ? [
        { guardians: { some: { phoneNormalized: { contains: phone } } } },
        { students: { some: { phone: { contains: query } } } },
        { students: { some: { phone: { contains: phone } } } },
        { students: { some: { parentPhone: { contains: query } } } },
        { students: { some: { parentPhone: { contains: phone } } } },
      ] : []),
    ],
  };
}

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.SEARCH_RETURNING_CUSTOMERS);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = String(searchParams.get('q') || '').trim();
  const kind = searchParams.get('kind') === 'submission' ? 'submission' : 'contact';

  if (query.length < 3) {
    return NextResponse.json({ error: 'Enter at least 3 characters to search' }, { status: 400 });
  }

  try {
    const cmsFamilies = kind === 'contact'
      ? await prisma.family.findMany({
          where: familySearchWhere(query),
          include: {
            guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
            students: {
              include: {
                enrollments: {
                  select: {
                    id: true,
                    programId: true,
                    batchNumber: true,
                    status: true,
                    paymentStatus: true,
                  },
                },
              },
              orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            },
          },
          orderBy: [{ isArchived: 'asc' }, { updatedAt: 'desc' }],
          take: 20,
        })
      : [];

    let wordpressResults: Array<Record<string, unknown>> = [];
    let wordpressError: string | null = null;

    try {
      const external = await searchExternalRegistrations(
        resolveExternalRegistrationLookup(query, kind)
      );
      wordpressResults = await Promise.all(
        external.slice(0, 20).map(async (registration) => ({
          ...registration,
          matchingFamilies: await findMatchingFamilies({
            email: registration.parentEmail,
            phone: registration.parentPhone,
            phoneCountryCode: registration.parentPhoneCountryCode,
            includeArchived: true,
          }),
        }))
      );
    } catch (error) {
      wordpressError = error instanceof Error ? error.message : 'WordPress history lookup failed';
    }

    return NextResponse.json({
      cmsFamilies,
      wordpressResults,
      wordpressLookupAttempted: true,
      wordpressError,
      hint: null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search returning customers' },
      { status: 500 }
    );
  }
}
