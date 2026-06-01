import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

const VALID_STATUSES = ['QUEUED', 'SENT', 'FAILED', 'DELIVERED', 'BOUNCED'] as const;
const VALID_EVENT_TYPES = ['CLASS_ASSIGNMENT', 'TEACHER_ASSIGNMENT', 'USER_INVITATION', 'PASSWORD_RESET'] as const;

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.READ_EMAIL_LOGS);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventType = searchParams.get('eventType');
    const search = searchParams.get('search')?.trim();
    const take = Math.min(Number(searchParams.get('take') || 100), 200);

    const where: any = {
      ...(status && VALID_STATUSES.includes(status as any) ? { status } : {}),
      ...(eventType && VALID_EVENT_TYPES.includes(eventType as any) ? { eventType } : {}),
      ...(search
        ? {
            OR: [
              { recipientEmail: { contains: search, mode: 'insensitive' } },
              { recipientName: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
              { error: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [logs, counts] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
      }),
      prisma.emailLog.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const summary = counts.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      { QUEUED: 0, SENT: 0, FAILED: 0, DELIVERED: 0, BOUNCED: 0 }
    );

    return NextResponse.json({ logs, summary });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
  }
}
