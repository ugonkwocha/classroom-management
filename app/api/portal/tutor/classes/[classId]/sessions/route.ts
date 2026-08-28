import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AccessDeniedError, requireTutorClassAccess } from '@/lib/access-control';
import { getActiveSessionUser } from '@/lib/auth';
import { parseTutorSessionInput, TutorSessionInputError } from '@/lib/tutor-session-input';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { classId } = await params;
    await requireTutorClassAccess(sessionUser.userId, classId);
    const roster = await prisma.programEnrollment.findMany({
      where: { classId, status: 'ASSIGNED' },
      select: { studentId: true },
    });
    const input = parseTutorSessionInput(
      await request.json(),
      roster.map((item) => item.studentId)
    );

    const session = await prisma.classSession.create({
      data: {
        classId,
        recordedById: sessionUser.userId,
        heldAt: input.heldAt,
        title: input.title,
        topics: input.topics,
        summary: input.summary,
        homework: input.homework,
        status: input.status as any,
        parentVisible: input.parentVisible,
        attendance: {
          create: input.attendance.map((item) => ({
            studentId: item.studentId,
            status: item.status as any,
            notes: item.notes,
            markedById: sessionUser.userId,
          })),
        },
        progressUpdates: {
          create: input.progressUpdates.map((item) => ({
            classId,
            studentId: item.studentId,
            authorId: sessionUser.userId,
            rating: item.rating as any,
            summary: item.summary,
            strengths: item.strengths,
            focusAreas: item.focusAreas,
            parentVisible: item.parentVisible,
          })),
        },
      },
      select: { id: true, classId: true, heldAt: true, title: true, status: true },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof TutorSessionInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A session already exists for this class at that date and time' }, { status: 409 });
    }
    console.error('Create tutor class session error:', error);
    return NextResponse.json({ error: 'Unable to save this class session' }, { status: 500 });
  }
}
