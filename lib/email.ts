import { SES } from 'aws-sdk';

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
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Initialize SES with credentials from environment variables
function initializeSES(): SES {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  console.log('[Email] Initializing AWS SES with:', {
    hasAccessKey: !!accessKeyId,
    hasSecretKey: !!secretAccessKey,
    region,
    fromEmail: process.env.AWS_SES_FROM_EMAIL,
  });

  if (!accessKeyId || !secretAccessKey) {
    console.error('[Email] ❌ AWS credentials are missing!');
    console.error('[Email] AWS_ACCESS_KEY_ID:', accessKeyId ? 'SET' : 'MISSING');
    console.error('[Email] AWS_SECRET_ACCESS_KEY:', secretAccessKey ? 'SET' : 'MISSING');
  }

  return new SES({
    accessKeyId,
    secretAccessKey,
    region,
  });
}

let ses: SES | null = null;

function getSES(): SES {
  if (!ses) {
    ses = initializeSES();
  }
  return ses;
}

/**
 * Generate HTML email template for class assignment
 */
function generateClassAssignmentEmailHTML(
  params: ClassAssignmentEmailParams,
  recipientName?: string
): string {
  const meetLinkSection = params.meetLink
    ? `
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #1f2937;">Class Meeting Link</p>
      <a href="${params.meetLink}" style="display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Join Google Meet
      </a>
    </div>
    `
    : '';

  const instructorSection =
    params.recipientType === 'teacher'
      ? ''
      : params.instructorName
        ? `
    <div style="margin: 15px 0;">
      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Instructor</p>
      <p style="margin: 0; font-weight: 600; color: #1f2937;">${params.instructorName}</p>
    </div>
    `
        : '';

  const studentParentMessage =
    params.recipientType === 'teacher'
      ? `Dear ${recipientName || 'Instructor'},`
      : params.recipientType === 'student'
        ? `Dear ${recipientName || 'Student'},`
        : `Dear Parent/Guardian,`;

  const bodyMessage =
    params.recipientType === 'teacher'
      ? `You have been assigned to teach the following class:`
      : params.recipientType === 'student'
        ? `You have been enrolled in the following class:`
        : `Your child/ward has been enrolled in the following class:`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Class Assignment - Academy Enrollment</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(to right, #7c3aed, #4c1d95); padding: 30px; border-radius: 8px; color: white; margin-bottom: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Academy Enrollment</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Class Assignment Notification</p>
        </div>

        <!-- Content -->
        <div>
          <p style="margin: 0 0 20px 0; font-size: 16px;">${studentParentMessage}</p>
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280;">${bodyMessage}</p>

          <!-- Class Details -->
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #7c3aed; margin: 20px 0;">
            <div style="margin: 0 0 15px 0;">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Program & Class</p>
              <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 16px;">${params.programName} - Batch ${params.batch}</p>
              <p style="margin: 5px 0 0 0; font-weight: 600; color: #1f2937; font-size: 16px;">${params.className}</p>
            </div>

            <div style="margin: 15px 0;">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Course</p>
              <p style="margin: 0; font-weight: 600; color: #1f2937;">${params.courseName}</p>
            </div>

            <div style="margin: 15px 0;">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Schedule</p>
              <p style="margin: 0; font-weight: 600; color: #1f2937;">${params.slot}</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">${params.schedule}</p>
            </div>

            ${instructorSection}

            <div style="margin: 15px 0;">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Enrollment Date</p>
              <p style="margin: 0; font-weight: 600; color: #1f2937;">${params.enrollmentDate}</p>
            </div>
          </div>

          ${meetLinkSection}

          <!-- Footer Message -->
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              ${params.recipientType === 'teacher' ? 'Please ensure you are prepared for this class. If you have any questions, contact the academy administration.' : 'Please mark your calendar and be ready for the class. If you have any questions, contact the academy.'}
            </p>
          </div>

          <!-- Contact Info -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">This is an automated message from Academy Enrollment System</p>
            <p style="margin: 8px 0 0 0;">If you have questions, please contact the academy administration</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send class assignment email via Amazon SES
 */
export async function sendClassAssignmentEmail(
  params: ClassAssignmentEmailParams
): Promise<EmailResponse[]> {
  try {
    console.log('[Email] Starting email sending process...');

    if (!params.recipients || params.recipients.length === 0) {
      console.warn('[Email] No recipients provided');
      return [{ success: false, error: 'No recipients provided' }];
    }

    console.log(`[Email] Sending emails to ${params.recipients.length} recipient(s)`);

    // Check AWS credentials
    const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
    const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
    const hasSESEmail = !!process.env.AWS_SES_FROM_EMAIL;

    if (!hasAccessKey || !hasSecretKey || !hasSESEmail) {
      const missing = [];
      if (!hasAccessKey) missing.push('AWS_ACCESS_KEY_ID');
      if (!hasSecretKey) missing.push('AWS_SECRET_ACCESS_KEY');
      if (!hasSESEmail) missing.push('AWS_SES_FROM_EMAIL');

      const errorMsg = `AWS credentials not fully configured. Missing: ${missing.join(', ')}`;
      console.error(`[Email] ❌ ${errorMsg}`);
      return [{ success: false, error: errorMsg }];
    }

    const sesInstance = getSES();
    const results: EmailResponse[] = [];

    for (const recipient of params.recipients) {
      try {
        console.log(`[Email] Preparing email for ${recipient.email}...`);

        const htmlContent = generateClassAssignmentEmailHTML(params, recipient.name);
        const fromEmail = process.env.AWS_SES_FROM_EMAIL || 'noreply@9jacodekids.com';

        const params_ses = {
          Source: fromEmail,
          Destination: {
            ToAddresses: [recipient.email],
          },
          Message: {
            Subject: {
              Data: `Class Assignment - ${params.programName} Batch ${params.batch}`,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: htmlContent,
                Charset: 'UTF-8',
              },
            },
          },
        };

        console.log(`[Email] Calling AWS SES.sendEmail() for ${recipient.email}...`);
        const response = await sesInstance.sendEmail(params_ses).promise();

        results.push({
          success: true,
          messageId: response.MessageId,
        });
        console.log(
          `[Email] ✅ Email sent to ${recipient.email} (${params.recipientType}). MessageId: ${response.MessageId}`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN';

        results.push({
          success: false,
          error: errorMessage,
        });

        console.error(`[Email] ❌ Failed to send email to ${recipient.email}:`, {
          error: errorMessage,
          code: errorCode,
          recipientType: params.recipientType,
        });
      }
    }

    console.log(`[Email] Email sending complete. Sent: ${results.filter(r => r.success).length}/${results.length}`);
    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Email] ❌ Unexpected error in sendClassAssignmentEmail:', error);
    return [{ success: false, error: errorMessage }];
  }
}

/**
 * Prepare recipients for class assignment notification
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
