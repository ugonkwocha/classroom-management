import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.READ_CONFIRMED_REGISTRATIONS);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const imports = await prisma.confirmedRegistrationImport.findMany({
      where: search
        ? {
            OR: [
              { parentFirstName: { contains: search, mode: 'insensitive' } },
              { parentLastName: { contains: search, mode: 'insensitive' } },
              { parentEmail: { contains: search, mode: 'insensitive' } },
              { parentPhone: { contains: search, mode: 'insensitive' } },
              { sourceSubmissionId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        family: true,
        program: true,
        children: {
          include: {
            student: true,
            program: true,
            course: true,
          },
        },
        paymentRecords: {
          include: {
            student: true,
            enrollment: {
              include: {
                program: true,
                class: true,
              },
            },
          },
        },
        paymentProofs: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(imports);
  } catch (error: any) {
    const status = error.message?.includes('permission') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch confirmed registrations' }, { status });
  }
}
