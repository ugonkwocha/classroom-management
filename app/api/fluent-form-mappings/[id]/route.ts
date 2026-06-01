import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.MANAGE_FORM_MAPPINGS);
    const { id } = await params;
    const data = await request.json();
    const mapping = await prisma.fluentFormMapping.update({
      where: { id },
      data: {
        formId: data.formId !== undefined ? String(data.formId).trim() : undefined,
        formName: data.formName !== undefined ? String(data.formName).trim() : undefined,
        programId: data.programId,
        defaultBatch: data.defaultBatch !== undefined ? Number(data.defaultBatch) : undefined,
        defaultPriceType: data.defaultPriceType,
        leadTag: data.leadTag !== undefined ? data.leadTag?.trim() || null : undefined,
        paidTag: data.paidTag !== undefined ? String(data.paidTag).trim() : undefined,
        removeLeadTagOnPaid: data.removeLeadTagOnPaid,
        isActive: data.isActive,
      },
      include: { program: true },
    });
    return NextResponse.json(mapping);
  } catch (error: any) {
    const status = error.message?.includes('permission') ? 403 : 400;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : error.message || 'Failed to update mapping' }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const sessionUser = await getActiveSessionUser(_request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.MANAGE_FORM_MAPPINGS);
    const { id } = await params;
    await prisma.fluentFormMapping.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message?.includes('permission') ? 403 : 400;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : error.message || 'Failed to delete mapping' }, { status });
  }
}
