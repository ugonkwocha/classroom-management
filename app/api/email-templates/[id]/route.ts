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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const template = await prisma.courseEmailTemplate.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!template) {
      return NextResponse.json({ error: 'Email template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json({ error: 'Failed to fetch email template' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_EMAIL_TEMPLATE);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const data = await request.json();
    const subject = requireText(data.subject, 'Subject');
    const body = requireText(data.body, 'Body');
    const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;

    const template = await prisma.courseEmailTemplate.update({
      where: { id },
      data: {
        subject,
        body,
        isActive,
        updatedById: sessionUser.userId,
      },
      include: { course: true },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update email template' },
      { status: 400 }
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.DELETE_EMAIL_TEMPLATE);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    await prisma.courseEmailTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return NextResponse.json({ error: 'Failed to delete email template' }, { status: 500 });
  }
}
