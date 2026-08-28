import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/auth';
import { AccessDeniedError } from '@/lib/access-control';
import { getParentDashboard } from '@/lib/parent-dashboard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getActiveSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(await getParentDashboard(user.userId));
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Parent dashboard error:', error);
    return NextResponse.json({ error: 'Unable to load parent dashboard' }, { status: 500 });
  }
}
