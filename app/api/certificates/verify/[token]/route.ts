import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const certificate = await prisma.studentCertificate.findUnique({
    where: { verificationToken: token },
    select: {
      certificateNumber: true,
      studentNameSnapshot: true,
      courseTitleSnapshot: true,
      completionDate: true,
      issuedAt: true,
      status: true,
      revokedAt: true,
    },
  });
  if (!certificate) return NextResponse.json({ valid: false, error: 'Certificate not found' }, { status: 404 });
  return NextResponse.json({ valid: certificate.status === 'ISSUED', ...certificate });
}
