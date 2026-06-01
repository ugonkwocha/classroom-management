import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

function requireText(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.READ_EMAIL_TEMPLATES);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const courses = await prisma.course.findMany({
      include: { emailTemplate: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      items: courses.map((course) => ({
        course,
        template: course.emailTemplate || null,
      })),
    });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json({ error: 'Failed to fetch email templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.CREATE_EMAIL_TEMPLATE);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const data = await request.json();
    const courseId = requireText(data.courseId, 'Course');
    const subject = requireText(data.subject, 'Subject');
    const body = requireText(data.body, 'Body');
    const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const template = await prisma.courseEmailTemplate.upsert({
      where: { courseId },
      create: {
        courseId,
        subject,
        body,
        isActive,
        updatedById: sessionUser.userId,
      },
      update: {
        subject,
        body,
        isActive,
        updatedById: sessionUser.userId,
      },
      include: { course: true },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error saving email template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save email template' },
      { status: 400 }
    );
  }
}
