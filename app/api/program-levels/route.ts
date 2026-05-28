import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { DEFAULT_PROGRAM_LEVEL_SETTINGS, createProgramLevelCode, mergeProgramLevelSettings } from '@/lib/program-levels';
import { ProgramLevel } from '@/types';

export async function GET(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.READ_COURSES);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const settings = await prisma.programLevelSetting.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(mergeProgramLevelSettings(settings));
  } catch (error) {
    console.error('Error fetching program level settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch program level settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_COURSE);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const data = await request.json();
    const level = data.level as ProgramLevel;
    const displayName = String(data.displayName || '').trim();
    const ageRange = typeof data.ageRange === 'string' ? data.ageRange.trim() : '';
    const description = typeof data.description === 'string' ? data.description.trim() : '';

    const existingSetting = await prisma.programLevelSetting.findUnique({
      where: { level },
    });

    if (!existingSetting) {
      return NextResponse.json({ error: 'Invalid program level' }, { status: 400 });
    }

    if (!displayName) {
      return NextResponse.json({ error: 'Program level name is required' }, { status: 400 });
    }

    const fallback = DEFAULT_PROGRAM_LEVEL_SETTINGS.find((setting) => setting.level === level);
    const setting = await prisma.programLevelSetting.update({
      where: { level },
      data: {
        displayName,
        ageRange: ageRange || fallback?.ageRange || null,
        description: description || fallback?.description || null,
      }
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error updating program level setting:', error);
    return NextResponse.json(
      { error: 'Failed to update program level setting' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_COURSE);
  } catch (error: any) {
    if (error.message.includes('does not have permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const data = await request.json();
    const displayName = String(data.displayName || '').trim();
    const ageRange = typeof data.ageRange === 'string' ? data.ageRange.trim() : '';
    const description = typeof data.description === 'string' ? data.description.trim() : '';

    if (!displayName) {
      return NextResponse.json({ error: 'Program level name is required' }, { status: 400 });
    }

    const existingSettings = await prisma.programLevelSetting.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const existingLabels = existingSettings.map((setting) => setting.displayName.toLowerCase());

    if (existingLabels.includes(displayName.toLowerCase())) {
      return NextResponse.json({ error: 'A program level with this name already exists' }, { status: 409 });
    }

    const baseCode = createProgramLevelCode(displayName);
    const existingCodes = new Set(existingSettings.map((setting) => setting.level));
    let level = baseCode;
    let suffix = 2;

    while (existingCodes.has(level)) {
      level = `${baseCode}_${suffix}`;
      suffix += 1;
    }

    const nextSortOrder = existingSettings.reduce((max, setting) => Math.max(max, setting.sortOrder), 0) + 1;
    const setting = await prisma.programLevelSetting.create({
      data: {
        level,
        displayName,
        ageRange: ageRange || null,
        description: description || null,
        sortOrder: nextSortOrder,
      },
    });

    return NextResponse.json(setting, { status: 201 });
  } catch (error) {
    console.error('Error creating program level setting:', error);
    return NextResponse.json(
      { error: 'Failed to create program level setting' },
      { status: 500 }
    );
  }
}
