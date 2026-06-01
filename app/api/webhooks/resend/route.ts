import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

function getWebhookHeaders(request: NextRequest) {
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');

  if (!id || !timestamp || !signature) {
    throw new Error('Missing webhook signature headers');
  }

  return { id, timestamp, signature };
}

function getEventStatus(type: string) {
  if (type === 'email.delivered') return 'DELIVERED';
  if (type === 'email.bounced') return 'BOUNCED';
  if (type === 'email.failed' || type === 'email.suppressed' || type === 'email.complained') return 'FAILED';
  if (type === 'email.sent') return 'SENT';
  return null;
}

function getEventError(event: any) {
  if (event.type === 'email.bounced') {
    return event.data?.bounce?.message || 'Recipient mail server rejected the email';
  }

  if (event.type === 'email.failed') {
    return event.data?.failed?.reason || 'Resend reported email delivery failure';
  }

  if (event.type === 'email.suppressed') {
    return event.data?.suppressed?.message || 'Resend suppressed this email';
  }

  if (event.type === 'email.complained') {
    return 'Recipient marked this email as spam';
  }

  if (event.type === 'email.delivery_delayed') {
    return 'Resend reported a temporary delivery delay';
  }

  return null;
}

function mergeWebhookPayload(existingPayload: Prisma.JsonValue | null, event: any): Prisma.InputJsonValue {
  const payload =
    existingPayload && typeof existingPayload === 'object' && !Array.isArray(existingPayload)
      ? (existingPayload as Record<string, unknown>)
      : {};

  return {
    ...payload,
    resendWebhook: {
      eventType: event.type,
      eventCreatedAt: event.created_at,
      lastReceivedAt: new Date().toISOString(),
      to: event.data?.to,
      subject: event.data?.subject,
      bounce: event.data?.bounce,
      failed: event.data?.failed,
      suppressed: event.data?.suppressed,
    },
  };
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Resend Webhook] RESEND_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 500 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY || 're_build_time_placeholder');
    const payload = await request.text();
    const event = resend.webhooks.verify({
      payload,
      headers: getWebhookHeaders(request),
      webhookSecret,
    });

    const eventData = 'data' in event ? (event.data as any) : null;
    const messageId = eventData?.email_id || null;

    if (!messageId) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const status = getEventStatus(event.type);
    const error = getEventError(event);
    const existingLog = await prisma.emailLog.findFirst({
      where: { providerMessageId: messageId },
      orderBy: { createdAt: 'desc' },
    });

    if (!existingLog) {
      console.warn('[Resend Webhook] Email log not found for provider message id:', messageId);
      return NextResponse.json({ received: true, matched: false });
    }

    await prisma.emailLog.update({
      where: { id: existingLog.id },
      data: {
        ...(status ? { status } : {}),
        error,
        deliveredAt: event.type === 'email.delivered' ? new Date(event.created_at) : existingLog.deliveredAt,
        payload: mergeWebhookPayload(existingLog.payload, event),
      },
    });

    return NextResponse.json({ received: true, matched: true });
  } catch (error) {
    console.error('[Resend Webhook] Invalid webhook:', error);
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
  }
}
