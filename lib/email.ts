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
  error?: string;
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

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'disabled');
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || process.env.RESEND_REPLY_TO_EMAIL;
const EMAIL_DELIVERY_ATTEMPTS = 3;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function escapeHtml(value: string | undefined): string {
  if (!value) return '';

  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

  if (EMAIL_PROVIDER !== 'resend') {
    console.warn('[Email] Email delivery is disabled. EMAIL_PROVIDER is not set to resend.', {
      provider: EMAIL_PROVIDER,
      recipientType: params.recipientType,
      className: params.className,
      recipientCount: params.recipients.length,
    });

    return params.recipients.map((recipient) => ({
      success: false,
      error: `Email delivery disabled. Message not sent to ${recipient.email}.`,
    }));
  }

  if (!resend || !EMAIL_FROM) {
    console.warn('[Email] Resend is not fully configured. Missing RESEND_API_KEY or EMAIL_FROM.', {
      hasApiKey: !!RESEND_API_KEY,
      hasFrom: !!EMAIL_FROM,
      recipientType: params.recipientType,
      className: params.className,
    });

    return params.recipients.map((recipient) => ({
      success: false,
      error: `Resend is not configured. Message not sent to ${recipient.email}.`,
    }));
  }

  const responses = await Promise.all(
    params.recipients.map(async (recipient) => {
      const email = buildClassAssignmentEmail(params, recipient);

      for (let attempt = 1; attempt <= EMAIL_DELIVERY_ATTEMPTS; attempt += 1) {
        try {
          const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: [recipient.email],
            subject: email.subject,
            html: email.html,
            text: email.text,
            ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
          });

          if (error) {
            const errorMessage = typeof error === 'string' ? error : error.message || 'Resend delivery failed';
            console.error('[Email] Resend delivery failed:', {
              recipient: recipient.email,
              attempt,
              error,
            });

            if (attempt === EMAIL_DELIVERY_ATTEMPTS) {
              return {
                success: false,
                error: errorMessage,
              };
            }
          } else {
            return {
              success: true,
              messageId: data?.id,
            };
          }
        } catch (error) {
          console.error('[Email] Resend delivery error:', {
            recipient: recipient.email,
            attempt,
            error,
          });

          if (attempt === EMAIL_DELIVERY_ATTEMPTS) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unexpected email delivery error',
            };
          }
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }

      return {
        success: false,
        error: 'Email delivery failed after retries',
      };
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
  if (EMAIL_PROVIDER !== 'resend') {
    console.warn('[Email] User invitation email delivery is disabled. EMAIL_PROVIDER is not set to resend.', {
      provider: EMAIL_PROVIDER,
      recipient: params.recipient.email,
    });

    return {
      success: false,
      error: `Email delivery disabled. Invite not sent to ${params.recipient.email}.`,
    };
  }

  if (!resend || !EMAIL_FROM) {
    console.warn('[Email] Resend is not fully configured for user invitations.', {
      hasApiKey: !!RESEND_API_KEY,
      hasFrom: !!EMAIL_FROM,
      recipient: params.recipient.email,
    });

    return {
      success: false,
      error: `Resend is not configured. Invite not sent to ${params.recipient.email}.`,
    };
  }

  const email = buildUserInvitationEmail(params);

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [params.recipient.email],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
    });

    if (error) {
      console.error('[Email] User invitation delivery failed:', {
        recipient: params.recipient.email,
        error,
      });

      return {
        success: false,
        error: typeof error === 'string' ? error : error.message || 'Resend delivery failed',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('[Email] User invitation delivery error:', {
      recipient: params.recipient.email,
      error,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected email delivery error',
    };
  }
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
  if (EMAIL_PROVIDER !== 'resend') {
    console.warn('[Email] Password reset email delivery is disabled. EMAIL_PROVIDER is not set to resend.', {
      provider: EMAIL_PROVIDER,
      recipient: params.recipient.email,
    });

    return {
      success: false,
      error: `Email delivery disabled. Password reset not sent to ${params.recipient.email}.`,
    };
  }

  if (!resend || !EMAIL_FROM) {
    console.warn('[Email] Resend is not fully configured for password resets.', {
      hasApiKey: !!RESEND_API_KEY,
      hasFrom: !!EMAIL_FROM,
      recipient: params.recipient.email,
    });

    return {
      success: false,
      error: `Resend is not configured. Password reset not sent to ${params.recipient.email}.`,
    };
  }

  const email = buildPasswordResetEmail(params);

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [params.recipient.email],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
    });

    if (error) {
      console.error('[Email] Password reset delivery failed:', {
        recipient: params.recipient.email,
        error,
      });

      return {
        success: false,
        error: typeof error === 'string' ? error : error.message || 'Resend delivery failed',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('[Email] Password reset delivery error:', {
      recipient: params.recipient.email,
      error,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected email delivery error',
    };
  }
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
