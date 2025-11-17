import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const history = await prisma.courseHistory.findUnique({
      where: { id: params.id },
      include: {
        student: true,
      },
    });

    if (!history) {
      return NextResponse.json(
        { error: 'Course history not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching course history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course history' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();

    const history = await prisma.courseHistory.update({
      where: { id: params.id },
      data: {
        completionStatus: data.completionStatus,
        endDate: data.endDate ? new Date(data.endDate) : null,
        performanceNotes: data.performanceNotes,
      },
      include: {
        student: true,
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error updating course history:', error);
    return NextResponse.json(
      { error: 'Failed to update course history' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.courseHistory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course history:', error);
    return NextResponse.json(
      { error: 'Failed to delete course history' },
      { status: 500 }
    );
  }
}
