import { NextRequest, NextResponse } from 'next/server';
import { AccessDeniedError } from '@/lib/access-control';
import { getActiveSessionUser } from '@/lib/auth';
import { getTutorDashboard } from '@/lib/tutor-dashboard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const dashboard = await getTutorDashboard(sessionUser.userId);
    if (!dashboard) return NextResponse.json({ error: 'Tutor profile was not found' }, { status: 404 });
    return NextResponse.json(dashboard);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Tutor dashboard error:', error);
    return NextResponse.json({ error: 'Unable to load tutor dashboard' }, { status: 500 });
  }
}
