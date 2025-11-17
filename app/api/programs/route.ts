import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const programs = await prisma.program.findMany({
      include: {
        classes: true,
        enrollments: true,
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
  try {
    const data = await request.json();

    const program = await prisma.program.create({
      data: {
        name: data.name,
        type: data.type,
        season: data.season,
        year: data.year,
        batches: data.batches,
        slots: data.slots || [],
      },
      include: {
        classes: true,
        enrollments: true,
      },
    });

    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    console.error('Error creating program:', error);
    return NextResponse.json(
      { error: 'Failed to create program' },
      { status: 500 }
    );
  }
}
