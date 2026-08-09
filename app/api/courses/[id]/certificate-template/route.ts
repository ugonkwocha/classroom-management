import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.READ_CERTIFICATES); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id }, include: { certificateTemplate: true } });
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  return NextResponse.json(course.certificateTemplate || {
    courseId: id,
    certificateTitle: course.name,
    achievementWording: 'and demonstrating an understanding of the core concepts and skills covered in this course.',
    isActive: false,
  });
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.MANAGE_COURSE_CERTIFICATE_TEMPLATES); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  const body = await request.json();
  const certificateTitle = String(body.certificateTitle || '').trim();
  const achievementWording = String(body.achievementWording || '').trim();
  if (!certificateTitle || !achievementWording) return NextResponse.json({ error: 'Certificate title and achievement wording are required' }, { status: 400 });
  const template = await prisma.courseCertificateTemplate.upsert({
    where: { courseId: id },
    create: { courseId: id, certificateTitle, achievementWording, isActive: Boolean(body.isActive), updatedById: user.userId },
    update: { certificateTitle, achievementWording, isActive: Boolean(body.isActive), updatedById: user.userId },
  });
  return NextResponse.json(template);
}
