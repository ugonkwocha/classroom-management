import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.REVOKE_CERTIFICATE); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  const body = await request.json();
  const reason = String(body.reason || '').trim();
  if (!reason) return NextResponse.json({ error: 'Revocation reason is required' }, { status: 400 });
  const certificate = await prisma.studentCertificate.update({ where: { id }, data: { status: 'REVOKED', revokedById: user.userId, revokedAt: new Date(), revocationReason: reason } });
  return NextResponse.json(certificate);
}
