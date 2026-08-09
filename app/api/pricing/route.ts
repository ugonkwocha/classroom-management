import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';

const MAX_PRICE = 10000000;

function normalizePriceCode(label: string) {
  return label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

function validAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_PRICE;
}

/** Fetch active pricing options for enrollment flows. Superadmins can request inactive options. */
export async function GET(request: NextRequest) {
  try {
    const auth = await getActiveSessionUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';
    const pricingConfigs = await prisma.pricingConfig.findMany({
      where: includeInactive && auth.role === 'SUPERADMIN' ? {} : { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
    });

    return NextResponse.json(pricingConfigs);
  } catch (error) {
    console.error('Error fetching pricing configs:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing configurations' }, { status: 500 });
  }
}

/** Create a new pricing option. */
export async function POST(request: NextRequest) {
  try {
    const auth = await getActiveSessionUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Only superadmins can manage pricing' }, { status: 403 });
    }

    const body = await request.json();
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const amount = body.amount;
    const priceType = normalizePriceCode(label);

    if (label.length < 2 || label.length > 60) {
      return NextResponse.json({ error: 'Option name must be between 2 and 60 characters' }, { status: 400 });
    }
    if (!priceType) {
      return NextResponse.json({ error: 'Enter an option name containing letters or numbers' }, { status: 400 });
    }
    if (description.length < 2 || description.length > 180) {
      return NextResponse.json({ error: 'Description must be between 2 and 180 characters' }, { status: 400 });
    }
    if (!validAmount(amount)) {
      return NextResponse.json({ error: 'Amount must be a whole number between 1 and 10,000,000 Naira' }, { status: 400 });
    }

    const duplicate = await prisma.pricingConfig.findFirst({
      where: { OR: [{ priceType }, { label: { equals: label, mode: 'insensitive' } }] },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'A pricing option with this name already exists' }, { status: 409 });
    }

    const highestOrder = await prisma.pricingConfig.aggregate({ _max: { displayOrder: true } });
    const created = await prisma.pricingConfig.create({
      data: {
        priceType,
        label,
        description,
        amount,
        isActive: true,
        isSystem: false,
        displayOrder: (highestOrder._max.displayOrder || 0) + 1,
        updatedBy: auth.userId,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating pricing config:', error);
    return NextResponse.json({ error: 'Failed to create pricing option' }, { status: 500 });
  }
}

/** Update an existing pricing option. Historical enrollments retain their stored code and amount. */
export async function PUT(request: NextRequest) {
  try {
    const auth = await getActiveSessionUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Only superadmins can manage pricing' }, { status: 403 });
    }

    const body = await request.json();
    const priceType = typeof body.priceType === 'string' ? body.priceType.trim() : '';
    if (!priceType) {
      return NextResponse.json({ error: 'Price type is required' }, { status: 400 });
    }

    const existing = await prisma.pricingConfig.findUnique({ where: { priceType } });
    if (!existing) return NextResponse.json({ error: 'Pricing option not found' }, { status: 404 });

    const label = body.label === undefined ? existing.label : String(body.label).trim();
    const description = body.description === undefined ? existing.description : String(body.description).trim();
    const amount = body.amount === undefined ? existing.amount : body.amount;
    const isActive = body.isActive === undefined ? existing.isActive : body.isActive;

    if (label.length < 2 || label.length > 60) {
      return NextResponse.json({ error: 'Option name must be between 2 and 60 characters' }, { status: 400 });
    }
    if (description.length < 2 || description.length > 180) {
      return NextResponse.json({ error: 'Description must be between 2 and 180 characters' }, { status: 400 });
    }
    if (!validAmount(amount)) {
      return NextResponse.json({ error: 'Amount must be a whole number between 1 and 10,000,000 Naira' }, { status: 400 });
    }
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Active status must be true or false' }, { status: 400 });
    }

    const duplicateLabel = await prisma.pricingConfig.findFirst({
      where: { label: { equals: label, mode: 'insensitive' }, priceType: { not: priceType } },
    });
    if (duplicateLabel) {
      return NextResponse.json({ error: 'A pricing option with this name already exists' }, { status: 409 });
    }

    const updated = await prisma.pricingConfig.update({
      where: { priceType },
      data: { label, description, amount, isActive, updatedBy: auth.userId },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating pricing config:', error);
    return NextResponse.json({ error: 'Failed to update pricing configuration' }, { status: 500 });
  }
}
