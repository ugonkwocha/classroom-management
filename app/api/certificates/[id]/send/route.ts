import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { sendStoredCertificate } from '@/lib/certificate-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.RESEND_CERTIFICATE); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  try { return NextResponse.json(await sendStoredCertificate(id, user.userId)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to send certificate' }, { status: 400 }); }
}
