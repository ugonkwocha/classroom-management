import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import {
  parseProgramBatchSchedules,
  ProgramBatchScheduleValidationError,
} from '@/lib/program-batch-schedules';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const program = await prisma.program.findUnique({
      where: { id: id },
      include: {
        classes: {
          include: {
            course: true,
            teacher: true,
            enrollments: true,
          },
        },
        enrollments: {
          include: {
            student: true,
            class: true,
          },
        },
        batchSchedules: {
          orderBy: { batchNumber: 'asc' },
        },
      },
    });

    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(program);
  } catch (error) {
    console.error('Error fetching program:', error);
    return NextResponse.json(
      { error: 'Failed to fetch program' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_PROGRAM);
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
    const shouldReplaceBatchSchedules = Array.isArray(data.batchSchedules);
    const batchSchedules = shouldReplaceBatchSchedules
      ? parseProgramBatchSchedules(data.batchSchedules, batches)
      : [];

    const program = await prisma.$transaction(async (tx) => {
      await tx.program.update({
        where: { id },
        data: {
          name: data.name,
          type: data.type,
          season: data.season,
          year: data.year,
          batches,
          slots: data.slots,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
        },
      });

      if (shouldReplaceBatchSchedules) {
        await tx.programBatchSchedule.deleteMany({ where: { programId: id } });
        if (batchSchedules.length > 0) {
          await tx.programBatchSchedule.createMany({
            data: batchSchedules.map((schedule) => ({ ...schedule, programId: id })),
          });
        }
      }

      return tx.program.findUniqueOrThrow({
        where: { id },
        include: {
          classes: true,
          enrollments: true,
          batchSchedules: {
            orderBy: { batchNumber: 'asc' },
          },
        },
      });
    });

    return NextResponse.json(program);
  } catch (error) {
    console.error('Error updating program:', error);
    const isValidationError = error instanceof ProgramBatchScheduleValidationError;
    return NextResponse.json(
      { error: isValidationError ? error.message : 'Failed to update program' },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.DELETE_PROGRAM);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  try {
    await prisma.program.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting program:', error);
    return NextResponse.json(
      { error: 'Failed to delete program' },
      { status: 500 }
    );
  }
}
