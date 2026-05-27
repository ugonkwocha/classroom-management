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

/**
 * Email delivery is intentionally disabled until a new provider is chosen.
 * The API routes can still call this function without crashing, and logs will show
 * exactly which messages would have been sent.
 */
export async function sendClassAssignmentEmail(
  params: ClassAssignmentEmailParams
): Promise<EmailResponse[]> {
  if (!params.recipients || params.recipients.length === 0) {
    console.warn('[Email] No recipients provided');
    return [{ success: false, error: 'No recipients provided' }];
  }

  console.warn('[Email] Email delivery is disabled. No provider is configured.', {
    recipientType: params.recipientType,
    className: params.className,
    programName: params.programName,
    recipientCount: params.recipients.length,
    hasMeetLink: !!params.meetLink,
  });

  return params.recipients.map((recipient) => ({
    success: false,
    error: `Email delivery disabled. Message not sent to ${recipient.email}.`,
  }));
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
