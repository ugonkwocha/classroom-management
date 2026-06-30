import { Resend } from 'resend';
import {
  renderTemplateHtml,
  renderTemplateText,
  type PreparationTemplateContext,
} from '@/lib/email-template-rendering';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface ClassAssignmentEmailParams {
  recipients: EmailRecipient[];
  className: string;
  courseName: string;
  programName: string;
  batch: number;
  slot: string;
  schedule: string;
  instructorName?: string;
  meetLink?: string;
  enrollmentDate: string;
  recipientType: 'teacher' | 'student' | 'parent';
  studentName?: string;
  template?: {
    subject: string;
    body: string;
    context: PreparationTemplateContext;
  };
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
  fallbackError?: string;
  attemptedProviders?: string[];
}

interface UserInvitationEmailParams {
  recipient: EmailRecipient;
  inviterName: string;
  role: string;
  invitationUrl: string;
  expiresAt: string;
}

interface PasswordResetEmailParams {
  recipient: EmailRecipient;
  requestedByName: string;
  resetUrl: string;
  expiresAt: string;
}

type EmailProvider = 'zeptomail' | 'resend' | 'disabled';

type BuiltEmail = {
  subject: string;
  html: string;
  text: string;
};

const EMAIL_PROVIDER = normalizeProvider(
  process.env.EMAIL_PROVIDER || (process.env.ZEPTOMAIL_SEND_MAIL_TOKEN ? 'zeptomail' : process.env.RESEND_API_KEY ? 'resend' : 'disabled')
);
const EMAIL_FALLBACK_PROVIDER = normalizeProvider(process.env.EMAIL_FALLBACK_PROVIDER || (EMAIL_PROVIDER === 'zeptomail' && process.env.RESEND_API_KEY ? 'resend' : undefined), undefined);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || process.env.RESEND_REPLY_TO_EMAIL;
const EMAIL_DELIVERY_ATTEMPTS = 3;
const ZEPTOMAIL_SEND_MAIL_TOKEN = process.env.ZEPTOMAIL_SEND_MAIL_TOKEN;
const ZEPTOMAIL_API_URL = process.env.ZEPTOMAIL_API_URL || 'https://api.zeptomail.com/v1.1/email';
const ZEPTOMAIL_FROM = parseEmailIdentity(process.env.ZEPTOMAIL_FROM_EMAIL || EMAIL_FROM);
const ZEPTOMAIL_FROM_NAME = process.env.ZEPTOMAIL_FROM_NAME || ZEPTOMAIL_FROM.name || '9jacodekids Academy';
const ZEPTOMAIL_REPLY_TO = parseEmailIdentity(process.env.ZEPTOMAIL_REPLY_TO_EMAIL || EMAIL_REPLY_TO);

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function normalizeProvider(value: string | undefined, defaultValue: EmailProvider = 'disabled'): EmailProvider {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'zeptomail' || normalized === 'resend' || normalized === 'disabled') {
    return normalized;
  }
  return defaultValue;
}

function parseEmailIdentity(value?: string | null): { email?: string; name?: string } {
  const raw = (value || '').trim();
  if (!raw) return {};

  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, '') || undefined,
      email: match[2].trim(),
    };
  }

  return { email: raw };
}

function getProviderAttempts(): EmailProvider[] {
  if (EMAIL_PROVIDER === 'disabled') return ['disabled'];
  const providers: EmailProvider[] = [EMAIL_PROVIDER];

  if (EMAIL_FALLBACK_PROVIDER && EMAIL_FALLBACK_PROVIDER !== 'disabled' && EMAIL_FALLBACK_PROVIDER !== EMAIL_PROVIDER) {
    providers.push(EMAIL_FALLBACK_PROVIDER);
  }

  return providers;
}

function getDeliveryError(error: unknown, fallbackMessage: string): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return fallbackMessage;
}

function escapeHtml(value: string | undefined): string {
  if (!value) return '';

  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendViaResend(recipient: EmailRecipient, email: BuiltEmail): Promise<EmailResponse> {
  if (!resend || !EMAIL_FROM) {
    return {
      success: false,
      provider: 'resend',
      error: `Resend is not configured. Message not sent to ${recipient.email}.`,
    };
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [recipient.email],
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
  });

  if (error) {
    return {
      success: false,
      provider: 'resend',
      error: getDeliveryError(error, 'Resend delivery failed'),
    };
  }

  return {
    success: true,
    provider: 'resend',
    messageId: data?.id,
  };
}

function getZeptoMailMessageId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const payload = data as Record<string, unknown>;

  if (typeof payload.request_id === 'string') return payload.request_id;
  if (typeof payload.requestId === 'string') return payload.requestId;
  if (typeof payload.messageId === 'string') return payload.messageId;
  if (typeof payload.message_id === 'string') return payload.message_id;

  return undefined;
}

async function sendViaZeptoMail(recipient: EmailRecipient, email: BuiltEmail): Promise<EmailResponse> {
  if (!ZEPTOMAIL_SEND_MAIL_TOKEN || !ZEPTOMAIL_FROM.email) {
    return {
      success: false,
      provider: 'zeptomail',
      error: `ZeptoMail is not configured. Message not sent to ${recipient.email}.`,
    };
  }

  const response = await fetch(ZEPTOMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-enczapikey ${ZEPTOMAIL_SEND_MAIL_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      from: {
        address: ZEPTOMAIL_FROM.email,
        name: ZEPTOMAIL_FROM_NAME,
      },
      to: [
        {
          email_address: {
            address: recipient.email,
            name: recipient.name || recipient.email,
          },
        },
      ],
      subject: email.subject,
      htmlbody: email.html,
      textbody: email.text,
      ...(ZEPTOMAIL_REPLY_TO.email
        ? {
            reply_to: [
              {
                address: ZEPTOMAIL_REPLY_TO.email,
                ...(ZEPTOMAIL_REPLY_TO.name ? { name: ZEPTOMAIL_REPLY_TO.name } : {}),
              },
            ],
          }
        : {}),
    }),
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const error =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : text || `ZeptoMail delivery failed with status ${response.status}`;

    return {
      success: false,
      provider: 'zeptomail',
      error,
    };
  }

  return {
    success: true,
    provider: 'zeptomail',
    messageId: getZeptoMailMessageId(data),
  };
}

async function sendViaProvider(provider: EmailProvider, recipient: EmailRecipient, email: BuiltEmail): Promise<EmailResponse> {
  if (provider === 'disabled') {
    return {
      success: false,
      provider: 'disabled',
      error: `Email delivery disabled. Message not sent to ${recipient.email}.`,
    };
  }

  if (provider === 'zeptomail') {
    return sendViaZeptoMail(recipient, email);
  }

  return sendViaResend(recipient, email);
}

async function sendWithRetries(
  provider: EmailProvider,
  recipient: EmailRecipient,
  email: BuiltEmail,
  attempts: number
): Promise<EmailResponse> {
  let lastError = 'Email delivery failed';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await sendViaProvider(provider, recipient, email);
      if (result.success) return result;

      lastError = result.error || lastError;
      console.error('[Email] Provider delivery failed:', {
        provider,
        recipient: recipient.email,
        attempt,
        error: result.error,
      });
    } catch (error) {
      lastError = getDeliveryError(error, 'Unexpected email delivery error');
      console.error('[Email] Provider delivery error:', {
        provider,
        recipient: recipient.email,
        attempt,
        error,
      });
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }

  return {
    success: false,
    provider,
    error: lastError,
  };
}

async function sendTransactionalEmail(recipient: EmailRecipient, email: BuiltEmail): Promise<EmailResponse> {
  const providers = getProviderAttempts();
  const attemptedProviders: string[] = [];
  let primaryError: string | undefined;

  for (const provider of providers) {
    attemptedProviders.push(provider);
    const attempts = provider === EMAIL_PROVIDER ? EMAIL_DELIVERY_ATTEMPTS : 1;
    const result = await sendWithRetries(provider, recipient, email, attempts);

    if (result.success) {
      return {
        ...result,
        attemptedProviders,
        ...(primaryError ? { fallbackError: primaryError } : {}),
      };
    }

    if (!primaryError) {
      primaryError = result.error || `${provider} delivery failed`;
    }
  }

  return {
    success: false,
    provider: providers[providers.length - 1],
    attemptedProviders,
    error: primaryError || 'Email delivery failed after retries',
  };
}

function getSubject(params: ClassAssignmentEmailParams): string {
  if (params.recipientType === 'teacher') {
    return `Tutor assignment: ${params.className}`;
  }

  if (params.template) {
    const subject = renderTemplateText(params.template.subject, params.template.context).trim();
    if (subject) return subject;
  }

  return params.studentName
    ? `Class details for ${params.studentName}`
    : `Class details for ${params.className}`;
}

function getIntro(params: ClassAssignmentEmailParams, recipient: EmailRecipient): string {
  const recipientName = recipient.name ? ` ${recipient.name}` : '';

  if (params.recipientType === 'teacher') {
    return `Hello${recipientName}, you have been assigned as a tutor for a class at 9jacodekids Academy.`;
  }

  return params.studentName
    ? `Hello${recipientName}, ${params.studentName} has been assigned to a class at 9jacodekids Academy.`
    : `Hello${recipientName}, your child has been assigned to a class at 9jacodekids Academy.`;
}

function buildClassAssignmentEmail(params: ClassAssignmentEmailParams, recipient: EmailRecipient) {
  if (params.template) {
    const recipientRole: PreparationTemplateContext['recipientRole'] =
      params.recipientType === 'student' ? 'student' : 'parent';
    const recipientName =
      recipientRole === 'student'
        ? recipient.name || params.studentName || 'Student'
        : recipient.name || params.template.context.parentName || 'Parent/Guardian';
    const context = {
      ...params.template.context,
      recipientName,
      recipientRole,
      parentName:
        params.recipientType === 'parent'
          ? recipient.name || params.template.context.parentName || 'Parent/Guardian'
          : params.template.context.parentName || 'Parent/Guardian',
    };
    const subject = renderTemplateText(params.template.subject, context).trim() || getSubject(params);
    const safeSubject = escapeHtml(subject);
    const htmlBody = renderTemplateHtml(params.template.body, context);
    const textBody = renderTemplateText(params.template.body, context);

    const html = `
      <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
          <div style="background:#06244a;border-radius:18px;padding:24px;color:#ffffff;">
            <div style="font-size:22px;font-weight:800;letter-spacing:.2px;">9jacodekids Academy</div>
            <div style="margin-top:6px;color:#bfdbfe;font-size:14px;">Class Management System</div>
          </div>

          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;margin-top:18px;padding:28px;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0f172a;">${safeSubject}</h1>
            ${htmlBody}
          </div>

          <p style="margin:18px 0 0;text-align:center;color:#94a3b8;font-size:12px;">
            Sent by 9jacodekids Academy.
          </p>
        </div>
      </div>
    `;

    const text = ['9jacodekids Academy', '', subject, '', textBody].join('\n');

    return { subject, html, text };
  }

  const safeClassName = escapeHtml(params.className);
  const safeCourseName = escapeHtml(params.courseName);
  const safeProgramName = escapeHtml(params.programName);
  const safeSlot = escapeHtml(params.slot);
  const safeSchedule = escapeHtml(params.schedule);
  const safeInstructorName = escapeHtml(params.instructorName || 'To be assigned');
  const safeMeetLink = escapeHtml(params.meetLink);
  const safeIntro = escapeHtml(getIntro(params, recipient));
  const safeEnrollmentDate = escapeHtml(params.enrollmentDate);
  const safeStudentName = escapeHtml(params.studentName);

  const meetLinkHtml = params.meetLink
    ? `<a href="${safeMeetLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Join Google Meet</a>`
    : '<span style="color:#64748b;">Meet link will be shared by the academy team.</span>';

  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#06244a;border-radius:18px;padding:24px;color:#ffffff;">
          <div style="font-size:22px;font-weight:800;letter-spacing:.2px;">9jacodekids Academy</div>
          <div style="margin-top:6px;color:#bfdbfe;font-size:14px;">Class Management System</div>
        </div>

        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;margin-top:18px;padding:28px;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#0f172a;">${safeClassName}</h1>
          <p style="margin:0 0 22px;color:#475569;font-size:15px;line-height:1.65;">${safeIntro}</p>

          <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <div style="display:flex;border-bottom:1px solid #e2e8f0;">
              <div style="width:42%;background:#f8fafc;padding:12px 14px;color:#64748b;font-size:13px;font-weight:700;">Student</div>
              <div style="padding:12px 14px;font-size:14px;font-weight:700;">${safeStudentName || 'Not provided'}</div>
            </div>
            <div style="display:flex;border-bottom:1px solid #e2e8f0;">
              <div style="width:42%;background:#f8fafc;padding:12px 14px;color:#64748b;font-size:13px;font-weight:700;">Course</div>
              <div style="padding:12px 14px;font-size:14px;font-weight:700;">${safeCourseName}</div>
            </div>
            <div style="display:flex;border-bottom:1px solid #e2e8f0;">
              <div style="width:42%;background:#f8fafc;padding:12px 14px;color:#64748b;font-size:13px;font-weight:700;">Program</div>
              <div style="padding:12px 14px;font-size:14px;font-weight:700;">${safeProgramName}</div>
            </div>
            <div style="display:flex;border-bottom:1px solid #e2e8f0;">
              <div style="width:42%;background:#f8fafc;padding:12px 14px;color:#64748b;font-size:13px;font-weight:700;">Batch / Slot</div>
              <div style="padding:12px 14px;font-size:14px;font-weight:700;">Batch ${params.batch} · ${safeSlot}</div>
            </div>
            <div style="display:flex;border-bottom:1px solid #e2e8f0;">
              <div style="width:42%;background:#f8fafc;padding:12px 14px;color:#64748b;font-size:13px;font-weight:700;">Schedule</div>
              <div style="padding:12px 14px;font-size:14px;font-weight:700;">${safeSchedule}</div>
            </div>
            <div style="display:flex;border-bottom:1px solid #e2e8f0;">
              <div style="width:42%;background:#f8fafc;padding:12px 14px;color:#64748b;font-size:13px;font-weight:700;">Tutor</div>
              <div style="padding:12px 14px;font-size:14px;font-weight:700;">${safeInstructorName}</div>
            </div>
            <div style="display:flex;">
              <div style="width:42%;background:#f8fafc;padding:12px 14px;color:#64748b;font-size:13px;font-weight:700;">Assigned On</div>
              <div style="padding:12px 14px;font-size:14px;font-weight:700;">${safeEnrollmentDate}</div>
            </div>
          </div>

          <div style="margin-top:24px;">${meetLinkHtml}</div>

          ${
            params.meetLink
              ? `<p style="margin:18px 0 0;color:#475569;font-size:13px;line-height:1.6;">Meet link: <a href="${safeMeetLink}" style="color:#2563eb;">${safeMeetLink}</a></p>`
              : ''
          }

        </div>

        <p style="margin:18px 0 0;text-align:center;color:#94a3b8;font-size:12px;">
          Sent by 9jacodekids Academy.
        </p>
      </div>
    </div>
  `;

  const text = [
    '9jacodekids Academy',
    '',
    getIntro(params, recipient),
    '',
    params.studentName ? `Student: ${params.studentName}` : '',
    `Class: ${params.className}`,
    `Course: ${params.courseName}`,
    `Program: ${params.programName}`,
    `Batch / Slot: Batch ${params.batch} - ${params.slot}`,
    `Schedule: ${params.schedule}`,
    `Tutor: ${params.instructorName || 'To be assigned'}`,
    `Assigned On: ${params.enrollmentDate}`,
    params.meetLink ? `Google Meet: ${params.meetLink}` : 'Google Meet: Link will be shared by the academy team.',
  ].join('\n');

  return { subject: getSubject(params), html, text };
}

export async function sendClassAssignmentEmail(
  params: ClassAssignmentEmailParams
): Promise<EmailResponse[]> {
  if (!params.recipients || params.recipients.length === 0) {
    console.warn('[Email] No recipients provided');
    return [{ success: false, error: 'No recipients provided' }];
  }

  const responses = await Promise.all(
    params.recipients.map(async (recipient) => {
      const email = buildClassAssignmentEmail(params, recipient);
      return sendTransactionalEmail(recipient, email);
    })
  );

  return responses;
}

function buildUserInvitationEmail(params: UserInvitationEmailParams) {
  const safeName = escapeHtml(params.recipient.name || 'there');
  const safeInviterName = escapeHtml(params.inviterName);
  const safeRole = escapeHtml(params.role.charAt(0) + params.role.slice(1).toLowerCase());
  const safeInvitationUrl = escapeHtml(params.invitationUrl);
  const safeExpiresAt = escapeHtml(params.expiresAt);

  const subject = 'Your 9jacodekids Academy invitation';
  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#06244a;border-radius:18px;padding:24px;color:#ffffff;">
          <div style="font-size:22px;font-weight:800;letter-spacing:.2px;">9jacodekids Academy</div>
          <div style="margin-top:6px;color:#bfdbfe;font-size:14px;">Class Management System</div>
        </div>

        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;margin-top:18px;padding:28px;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#0f172a;">You're invited</h1>
          <p style="margin:0 0 18px;color:#475569;font-size:15px;line-height:1.65;">
            Hello ${safeName}, ${safeInviterName} invited you to join the 9jacodekids Academy Class Management System as ${safeRole}.
          </p>
          <p style="margin:0 0 22px;color:#475569;font-size:15px;line-height:1.65;">
            Use the button below to create your account password. This invite expires on ${safeExpiresAt}.
          </p>
          <a href="${safeInvitationUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Accept Invitation</a>
          <p style="margin:18px 0 0;color:#475569;font-size:13px;line-height:1.6;">
            Invite link: <a href="${safeInvitationUrl}" style="color:#2563eb;">${safeInvitationUrl}</a>
          </p>
        </div>

        <p style="margin:18px 0 0;text-align:center;color:#94a3b8;font-size:12px;">
          Sent by 9jacodekids Academy.
        </p>
      </div>
    </div>
  `;

  const text = [
    '9jacodekids Academy',
    '',
    `Hello ${params.recipient.name || 'there'},`,
    `${params.inviterName} invited you to join the 9jacodekids Academy Class Management System as ${params.role}.`,
    '',
    `Accept invitation: ${params.invitationUrl}`,
    `Expires: ${params.expiresAt}`,
  ].join('\n');

  return { subject, html, text };
}

export async function sendUserInvitationEmail(params: UserInvitationEmailParams): Promise<EmailResponse> {
  const email = buildUserInvitationEmail(params);
  return sendTransactionalEmail(params.recipient, email);
}

function buildPasswordResetEmail(params: PasswordResetEmailParams) {
  const safeName = escapeHtml(params.recipient.name || 'there');
  const safeRequestedByName = escapeHtml(params.requestedByName);
  const safeResetUrl = escapeHtml(params.resetUrl);
  const safeExpiresAt = escapeHtml(params.expiresAt);

  const subject = 'Reset your 9jacodekids Academy password';
  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#06244a;border-radius:18px;padding:24px;color:#ffffff;">
          <div style="font-size:22px;font-weight:800;letter-spacing:.2px;">9jacodekids Academy</div>
          <div style="margin-top:6px;color:#bfdbfe;font-size:14px;">Class Management System</div>
        </div>

        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;margin-top:18px;padding:28px;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#0f172a;">Reset your password</h1>
          <p style="margin:0 0 18px;color:#475569;font-size:15px;line-height:1.65;">
            Hello ${safeName}, ${safeRequestedByName} requested a password reset for your 9jacodekids Academy account.
          </p>
          <p style="margin:0 0 22px;color:#475569;font-size:15px;line-height:1.65;">
            Use the button below to choose a new password. This link expires on ${safeExpiresAt}.
          </p>
          <a href="${safeResetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Reset Password</a>
          <p style="margin:18px 0 0;color:#475569;font-size:13px;line-height:1.6;">
            Reset link: <a href="${safeResetUrl}" style="color:#2563eb;">${safeResetUrl}</a>
          </p>
          <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
            If you were not expecting this reset, contact your academy administrator.
          </p>
        </div>

        <p style="margin:18px 0 0;text-align:center;color:#94a3b8;font-size:12px;">
          Sent by 9jacodekids Academy.
        </p>
      </div>
    </div>
  `;

  const text = [
    '9jacodekids Academy',
    '',
    `Hello ${params.recipient.name || 'there'},`,
    `${params.requestedByName} requested a password reset for your 9jacodekids Academy account.`,
    '',
    `Reset password: ${params.resetUrl}`,
    `Expires: ${params.expiresAt}`,
    '',
    'If you were not expecting this reset, contact your academy administrator.',
  ].join('\n');

  return { subject, html, text };
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<EmailResponse> {
  const email = buildPasswordResetEmail(params);
  return sendTransactionalEmail(params.recipient, email);
}

/**
 * Prepare recipients for class assignment notification.
 */
export function prepareClassAssignmentRecipients(
  teacherName: string | null | undefined,
  teacherEmail: string | null | undefined,
  studentName: string,
  studentEmail: string | null | undefined,
  parentEmail: string | null | undefined
): {
  teachers: EmailRecipient[];
  students: EmailRecipient[];
  parents: EmailRecipient[];
} {
  return {
    teachers:
      teacherName && teacherEmail
        ? [{ email: teacherEmail, name: teacherName }]
        : [],
    students:
      studentEmail && studentEmail.trim()
        ? [{ email: studentEmail, name: studentName }]
        : [],
    parents:
      parentEmail && parentEmail.trim()
        ? [{ email: parentEmail, name: 'Parent/Guardian' }]
        : [],
  };
}
