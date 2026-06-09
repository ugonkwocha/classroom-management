import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.READ_CONFIRMED_REGISTRATIONS);
    const mappings = await prisma.fluentFormMapping.findMany({
      include: {
        program: true,
        optionMappings: {
          orderBy: [{ batchNumber: 'asc' }, { sourceOptionText: 'asc' }],
        },
      },
      orderBy: [{ isActive: 'desc' }, { formName: 'asc' }],
    });
    return NextResponse.json(mappings);
  } catch (error: any) {
    const status = error.message?.includes('permission') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch mappings' }, { status });
  }
}

export async function POST(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.MANAGE_FORM_MAPPINGS);
    const data = await request.json();
    const optionMappings = Array.isArray(data.optionMappings) ? data.optionMappings : [];
    const mapping = await prisma.fluentFormMapping.create({
      data: {
        formId: String(data.formId || '').trim(),
        formName: String(data.formName || '').trim(),
        programId: data.programId,
        defaultBatch: 1,
        defaultPriceType: 'FULL_PRICE',
        leadTag: data.leadTag?.trim() || null,
        paidTag: String(data.paidTag || '').trim(),
        removeLeadTagOnPaid: Boolean(data.removeLeadTagOnPaid),
        isActive: data.isActive ?? true,
        optionMappings: {
          create: optionMappings
            .map((option: any) => ({
              sourceOptionText: String(option.sourceOptionText || '').trim(),
              batchNumber: Number(option.batchNumber || 1),
              paidTag: String(option.paidTag || '').trim() || null,
              isActive: option.isActive ?? true,
            }))
            .filter((option: any) => option.sourceOptionText && option.batchNumber > 0),
        },
      },
      include: {
        program: true,
        optionMappings: {
          orderBy: [{ batchNumber: 'asc' }, { sourceOptionText: 'asc' }],
        },
      },
    });
    return NextResponse.json(mapping, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes('permission') ? 403 : 400;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : error.message || 'Failed to create mapping' }, { status });
  }
}
