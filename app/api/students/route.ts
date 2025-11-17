import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const students = await prisma.student.findMany({
      include: {
        enrollments: true,
        courseHistory: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const student = await prisma.student.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        isReturningStudent: data.isReturningStudent || false,
        parentEmail: data.parentEmail,
        parentPhone: data.parentPhone,
      },
      include: {
        enrollments: true,
        courseHistory: true,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
