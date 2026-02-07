import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

/**
 * GET /api/pricing
 * Fetch all pricing configurations
 * Accessible to: All authenticated users
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getSessionUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pricingConfigs = await prisma.pricingConfig.findMany({
      orderBy: {
        priceType: 'asc',
      },
    });

    return NextResponse.json(pricingConfigs);
  } catch (error) {
    console.error('Error fetching pricing configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing configurations' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pricing
 * Update pricing configuration
 * Requires: SUPERADMIN role
 *
 * Body: {
 *   priceType: 'FULL_PRICE' | 'SIBLING_DISCOUNT' | 'EARLY_BIRD'
 *   amount: number (in Naira)
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = getSessionUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmins can manage pricing
    if (auth.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Only superadmins can manage pricing' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { priceType, amount } = body;

    // Validate input
    if (!priceType || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: priceType and amount' },
        { status: 400 }
      );
    }

    if (!['FULL_PRICE', 'SIBLING_DISCOUNT', 'EARLY_BIRD'].includes(priceType)) {
      return NextResponse.json(
        { error: 'Invalid price type' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Update or create pricing config
    const updatedPricing = await prisma.pricingConfig.upsert({
      where: { priceType },
      update: {
        amount,
        updatedBy: auth.userId,
        updatedAt: new Date(),
      },
      create: {
        priceType,
        amount,
        updatedBy: auth.userId,
      },
    });

    return NextResponse.json(updatedPricing);
  } catch (error) {
    console.error('Error updating pricing config:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing configuration' },
      { status: 500 }
    );
  }
}
