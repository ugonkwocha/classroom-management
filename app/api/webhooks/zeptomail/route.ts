import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { EmailLogStatus, type Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

type ZeptoMailWebhookMessage = {
  request_id?: string;
  requestId?: string;
  email_info?: Array<{
    email_reference?: string;
    subject?: string;
    to?: unknown;
  }>;
  event_data?: Array<{
    details?: Array<Record<string, unknown>>;
  }>;
};

type ZeptoMailWebhookEvent = {
  event_name?: string;
  event_message?: ZeptoMailWebhookMessage[] | ZeptoMailWebhookMessage;
  mailagent_key?: string;
  webhook_request_id?: string;
};

const STATUS_PRECEDENCE: Record<EmailLogStatus, number> = {
  QUEUED: 0,
  SENT: 1,
  DELIVERED: 2,
  BOUNCED: 3,
  FAILED: 3,
};

const DEFAULT_WEBHOOK_AUTH_HEADER = 'x-zeptomail-webhook-secret';

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function parseProducerSignature(header: string) {
  const decoded = safeDecode(header);
  return decoded.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=', 2);
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});
}

function extractSignedPayload(body: string) {
  const decodedBody = safeDecode(body);
  const dataIndex = decodedBody.indexOf('data=');

  if (dataIndex >= 0) {
    return decodedBody.slice(dataIndex + 'data='.length);
  }

  return decodedBody;
}

function verifySignature(body: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;

  const signatureParts = parseProducerSignature(signatureHeader);
  const receivedSignature = signatureParts.s;
  const algorithm = (signatureParts['s-algorithm'] || '').toLowerCase();

  if (!receivedSignature || (algorithm && algorithm !== 'hmacsha256')) {
    return false;
  }

  const signedPayload = extractSignedPayload(body);
  const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('base64');
  const receivedBuffer = Buffer.from(receivedSignature, 'base64');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64');

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function verifyCustomAuthHeader(request: NextRequest, secret: string) {
  const headerName = process.env.ZEPTOMAIL_WEBHOOK_AUTH_HEADER || DEFAULT_WEBHOOK_AUTH_HEADER;
  const receivedSecret = request.headers.get(headerName);

  if (!receivedSecret) return false;

  const expectedBuffer = Buffer.from(secret);
  const receivedBuffer = Buffer.from(receivedSecret);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function parseWebhookEvent(body: string): ZeptoMailWebhookEvent | null {
  const payload = extractSignedPayload(body).trim();
  if (!payload) return null;

  try {
    const event = JSON.parse(payload) as ZeptoMailWebhookEvent;
    if (!event.event_name && !event.event_message) return null;
    return event;
  } catch {
    return null;
  }
}

function getEventStatus(eventName?: string): EmailLogStatus | null {
  const normalized = (eventName || '').trim().toLowerCase();

  if (normalized === 'processed' || normalized === 'sent') return EmailLogStatus.SENT;
  if (normalized === 'delivered') return EmailLogStatus.DELIVERED;
  if (normalized === 'hard bounce' || normalized === 'soft bounce' || normalized.includes('bounce')) {
    return EmailLogStatus.BOUNCED;
  }
  if (normalized === 'feedback loop' || normalized.includes('complaint') || normalized.includes('failed')) {
    return EmailLogStatus.FAILED;
  }

  return null;
}

function shouldUpdateStatus(currentStatus: EmailLogStatus, nextStatus: EmailLogStatus | null) {
  if (!nextStatus) return false;
  if (nextStatus === EmailLogStatus.SENT && STATUS_PRECEDENCE[currentStatus] > STATUS_PRECEDENCE.SENT) {
    return false;
  }
  return STATUS_PRECEDENCE[nextStatus] >= STATUS_PRECEDENCE[currentStatus];
}

function getWebhookMessages(event: ZeptoMailWebhookEvent): ZeptoMailWebhookMessage[] {
  if (!event.event_message) return [];
  return Array.isArray(event.event_message) ? event.event_message : [event.event_message];
}

function getMessageId(message: ZeptoMailWebhookMessage) {
  if (message.request_id) return message.request_id;
  if (message.requestId) return message.requestId;

  const emailReference = message.email_info?.find((info) => info.email_reference)?.email_reference;
  return emailReference || null;
}

function getEventDetails(message: ZeptoMailWebhookMessage) {
  return message.event_data?.flatMap((eventData) => eventData.details || []) || [];
}

function getEventError(eventName: string | undefined, message: ZeptoMailWebhookMessage) {
  const status = getEventStatus(eventName);
  if (status !== EmailLogStatus.BOUNCED && status !== EmailLogStatus.FAILED) {
    return null;
  }

  const details = getEventDetails(message);
  const detailText = details
    .map((detail) => {
      const reason = detail.reason || detail.diagnostic_message || detail.diagnostic_code || detail.email_status;
      return typeof reason === 'string' && reason.trim() ? reason.trim() : null;
    })
    .filter(Boolean)
    .join('; ');

  return detailText || `${eventName || 'ZeptoMail'} reported delivery failure`;
}

function getEventTime(message: ZeptoMailWebhookMessage) {
  const details = getEventDetails(message);
  const rawTime = details.find((detail) => typeof detail.time === 'string')?.time;

  if (typeof rawTime !== 'string') return new Date();

  const parsed = new Date(rawTime);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function mergeWebhookPayload(
  existingPayload: Prisma.JsonValue | null,
  event: ZeptoMailWebhookEvent,
  message: ZeptoMailWebhookMessage
): Prisma.InputJsonValue {
  const payload =
    existingPayload && typeof existingPayload === 'object' && !Array.isArray(existingPayload)
      ? (existingPayload as Record<string, unknown>)
      : {};

  return {
    ...payload,
    zeptoMailWebhook: {
      eventName: event.event_name,
      mailagentKey: event.mailagent_key,
      webhookRequestId: event.webhook_request_id,
      requestId: getMessageId(message),
      lastReceivedAt: new Date().toISOString(),
      emailInfo: message.email_info || null,
      eventData: message.event_data || null,
    },
  } as Prisma.InputJsonValue;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.ZEPTOMAIL_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[ZeptoMail Webhook] ZEPTOMAIL_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 500 });
  }

  try {
    const body = await request.text();
    const signatureHeader = request.headers.get('producer-signature');
    const isAuthenticated =
      verifySignature(body, signatureHeader, webhookSecret) ||
      verifyCustomAuthHeader(request, webhookSecret);
    const event = parseWebhookEvent(body);

    if (!event) {
      return NextResponse.json({ received: true, verified: true });
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const nextStatus = getEventStatus(event.event_name);
    const messages = getWebhookMessages(event);
    let matched = 0;
    let ignored = 0;

    for (const message of messages) {
      const messageId = getMessageId(message);

      if (!messageId) {
        ignored += 1;
        continue;
      }

      const existingLog = await prisma.emailLog.findFirst({
        where: {
          provider: 'zeptomail',
          providerMessageId: messageId,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!existingLog) {
        console.warn('[ZeptoMail Webhook] Email log not found for provider message id:', messageId);
        ignored += 1;
        continue;
      }

      const updateStatus = shouldUpdateStatus(existingLog.status, nextStatus);
      const resolvedStatus = updateStatus ? nextStatus : existingLog.status;
      const eventError = getEventError(event.event_name, message);

      await prisma.emailLog.update({
        where: { id: existingLog.id },
        data: {
          ...(updateStatus && nextStatus ? { status: nextStatus } : {}),
          error:
            resolvedStatus === EmailLogStatus.BOUNCED || resolvedStatus === EmailLogStatus.FAILED
              ? eventError || existingLog.error
              : existingLog.error,
          deliveredAt:
            resolvedStatus === EmailLogStatus.DELIVERED
              ? existingLog.deliveredAt || getEventTime(message)
              : existingLog.deliveredAt,
          payload: mergeWebhookPayload(existingLog.payload, event, message),
        },
      });

      matched += 1;
    }

    return NextResponse.json({ received: true, matched, ignored });
  } catch (error) {
    console.error('[ZeptoMail Webhook] Invalid webhook:', error);
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
  }
}
