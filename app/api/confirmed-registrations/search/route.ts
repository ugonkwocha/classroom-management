import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { searchExternalRegistrations } from '@/lib/wordpress-registrations';
import { findMatchingFamilies } from '@/lib/paid-registration-utils';

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.SEARCH_CONFIRMED_REGISTRATIONS);
  } catch (error: any) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const results = await searchExternalRegistrations({
      email: searchParams.get('email'),
      phone: searchParams.get('phone'),
      submissionId: searchParams.get('submissionId'),
      formId: searchParams.get('formId'),
    });

    const enriched = await Promise.all(
      results.map(async (result) => ({
        ...result,
        matchingFamilies: await findMatchingFamilies({
          email: result.parentEmail,
          phone: result.parentPhone,
          phoneCountryCode: result.parentPhoneCountryCode,
        }),
      }))
    );

    return NextResponse.json({ results: enriched });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search confirmed registrations' },
      { status: 500 }
    );
  }
}
