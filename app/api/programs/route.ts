import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import {
  parseProgramBatchSchedules,
  ProgramBatchScheduleValidationError,
} from '@/lib/program-batch-schedules';

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.READ_PROGRAMS);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    const programs = await prisma.program.findMany({
      include: {
        classes: true,
        enrollments: true,
        batchSchedules: {
          orderBy: { batchNumber: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.CREATE_PROGRAM);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    const data = await request.json();
    const batches = Number(data.batches);
    const batchSchedules = parseProgramBatchSchedules(data.batchSchedules, batches);

    const program = await prisma.program.create({
      data: {
        name: data.name,
        type: data.type,
        season: data.season,
        year: data.year,
        batches,
        slots: data.slots || [],
        startDate: new Date(data.startDate),
        batchSchedules: batchSchedules.length > 0
          ? {
              create: batchSchedules,
            }
          : undefined,
      },
      include: {
        classes: true,
        enrollments: true,
        batchSchedules: {
          orderBy: { batchNumber: 'asc' },
        },
      },
    });

    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    console.error('Error creating program:', error);
    const isValidationError = error instanceof ProgramBatchScheduleValidationError;
    return NextResponse.json(
      { error: isValidationError ? error.message : 'Failed to create program' },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
