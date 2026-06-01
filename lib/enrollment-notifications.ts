import prisma from '@/lib/prisma';
import { sendClassAssignmentEmail, sendPreparationInstructionsEmail } from '@/lib/email';
import { formatGuardianName } from '@/lib/family-utils';
import { renderTemplateText } from '@/lib/email-template-rendering';
import { MISSING_PREPARATION_TEMPLATE_ERROR } from '@/lib/course-email-template-requirements';

type NotificationRecipient = {
  email: string;
  name?: string;
  source: 'guardian' | 'legacy-parent' | 'student';
};

type NotificationOptions = {
  enrollmentId?: string | null;
  triggeredById?: string | null;
  resendOfLogId?: string | null;
  mode?: 'all' | 'class-details-only' | 'preparation-only';
  recipientEmail?: string | null;
};

function normalizeEmail(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function dedupeRecipients(recipients: NotificationRecipient[]) {
  const seen = new Set<string>();

  return recipients.filter((recipient) => {
    const email = normalizeEmail(recipient.email);
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

function getAssignmentSubject(studentName: string) {
  return studentName ? `Class details for ${studentName}` : 'Class assignment details';
}

async function createEmailLogs({
  recipients,
  recipientRole,
  subject,
  eventType,
  studentId,
  classId,
  options,
  payload,
}: {
  recipients: NotificationRecipient[];
  recipientRole: 'parent' | 'student';
  subject: string;
  eventType: 'CLASS_ASSIGNMENT' | 'PREPARATION_INSTRUCTIONS';
  studentId: string;
  classId: string;
  options?: NotificationOptions;
  payload: Record<string, unknown>;
}) {
  return Promise.all(
    recipients.map((recipient) =>
      prisma.emailLog.create({
        data: {
          eventType,
          status: 'QUEUED',
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          recipientRole,
          subject,
          studentId,
          classId,
          enrollmentId: options?.enrollmentId || null,
          triggeredById: options?.triggeredById || null,
          payload: {
            ...payload,
            recipientSource: recipient.source,
            resendOfLogId: options?.resendOfLogId || null,
          },
        },
      })
    )
  );
}

async function updateEmailLogsWithResults(
  logs: { id: string }[],
  results: { success: boolean; messageId?: string; error?: string }[]
) {
  await Promise.all(
    logs.map((log, index) => {
      const result = results[index];
      return prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: result?.success ? 'SENT' : 'FAILED',
          providerMessageId: result?.messageId || null,
          error: result?.success ? null : result?.error || 'Email delivery failed',
          sentAt: result?.success ? new Date() : null,
        },
      });
    })
  );
}

export async function sendEnrollmentAssignmentNotification(
  studentId: string,
  classId: string,
  options: NotificationOptions = {}
) {
  const [student, classData] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        family: {
          include: {
            guardians: {
              orderBy: [
                { isPrimary: 'desc' },
                { createdAt: 'asc' },
              ],
            },
          },
        },
      },
    }),
    prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: {
          include: {
            emailTemplate: true,
          },
        },
        program: true,
        teacher: true,
      },
    }),
  ]);

  if (!student) {
    return {
      success: false,
      error: 'Student not found for assignment notification',
      recipients: [],
      emailsSent: { parents: 0, students: 0 },
      emailsFailed: { parents: 0, students: 0 },
    };
  }

  if (!classData) {
    return {
      success: false,
      error: 'Class not found for assignment notification',
      recipients: [],
      emailsSent: { parents: 0, students: 0 },
      emailsFailed: { parents: 0, students: 0 },
    };
  }

  const guardianRecipients: NotificationRecipient[] = (student.family?.guardians || [])
    .filter((guardian) => guardian.isActive && guardian.email?.trim())
    .map((guardian) => ({
      email: guardian.email as string,
      name: formatGuardianName(guardian.firstName, guardian.lastName) || 'Parent/Guardian',
      source: 'guardian' as const,
    }));

  const legacyParentRecipient: NotificationRecipient[] = student.parentEmail?.trim()
    ? [{ email: student.parentEmail, name: 'Parent/Guardian', source: 'legacy-parent' as const }]
    : [];

  let parentRecipients = dedupeRecipients([...guardianRecipients, ...legacyParentRecipient]);
  let studentRecipients = dedupeRecipients(
    student.email?.trim()
      ? [{ email: student.email, name: `${student.firstName} ${student.lastName}`.trim(), source: 'student' as const }]
      : []
  );

  const recipientEmail = normalizeEmail(options.recipientEmail);
  if (recipientEmail) {
    parentRecipients = parentRecipients.filter((recipient) => normalizeEmail(recipient.email) === recipientEmail);
    studentRecipients = studentRecipients.filter((recipient) => normalizeEmail(recipient.email) === recipientEmail);
  }

  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const enrollmentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sharedEmailParams = {
    className: classData.name,
    courseName: classData.course.name,
    programName: classData.program.name,
    batch: classData.batch,
    slot: classData.slot,
    schedule: classData.schedule,
    instructorName: classData.teacher?.firstName || undefined,
    meetLink: classData.meetLink || undefined,
    enrollmentDate,
    studentName,
  };
  const subject = getAssignmentSubject(studentName);
  const mode = options.mode || 'all';
  const shouldSendClassDetails = mode !== 'preparation-only';
  const shouldSendPreparation = mode !== 'class-details-only';
  const preparationTemplate = classData.course.emailTemplate;

  if (shouldSendPreparation && !preparationTemplate?.isActive) {
    return {
      success: false,
      error: MISSING_PREPARATION_TEMPLATE_ERROR,
      recipients: [],
      emailsSent: { parents: 0, students: 0, preparationParents: 0, preparationStudents: 0 },
      emailsFailed: { parents: 0, students: 0, preparationParents: 0, preparationStudents: 0 },
    };
  }

  const preparationContext = {
    studentName,
    courseName: classData.course.name,
    className: classData.name,
    programName: classData.program.name,
    schedule: classData.schedule,
    tutorFirstName: classData.teacher?.firstName || 'your tutor',
    meetLink: classData.meetLink || 'Meet link will be shared by the academy team.',
  };
  const preparationSubject = preparationTemplate
    ? renderTemplateText(preparationTemplate.subject, preparationContext)
    : '';
  const logPayload = {
    className: classData.name,
    courseName: classData.course.name,
    programName: classData.program.name,
    batch: classData.batch,
    slot: classData.slot,
    schedule: classData.schedule,
    meetLink: classData.meetLink || null,
  };

  const parentLogs = shouldSendClassDetails
    ? await createEmailLogs({
        recipients: parentRecipients,
        recipientRole: 'parent',
        subject,
        eventType: 'CLASS_ASSIGNMENT',
        studentId,
        classId,
        options,
        payload: logPayload,
      })
    : [];

  const studentLogs = shouldSendClassDetails
    ? await createEmailLogs({
        recipients: studentRecipients,
        recipientRole: 'student',
        subject,
        eventType: 'CLASS_ASSIGNMENT',
        studentId,
        classId,
        options,
        payload: logPayload,
      })
    : [];

  const parentEmailResults =
    shouldSendClassDetails && parentRecipients.length > 0
      ? await sendClassAssignmentEmail({
          recipients: parentRecipients,
          ...sharedEmailParams,
          recipientType: 'parent',
        })
      : [];

  const studentEmailResults =
    shouldSendClassDetails && studentRecipients.length > 0
      ? await sendClassAssignmentEmail({
          recipients: studentRecipients,
          ...sharedEmailParams,
          recipientType: 'student',
        })
      : [];

  await Promise.all([
    updateEmailLogsWithResults(parentLogs, parentEmailResults),
    updateEmailLogsWithResults(studentLogs, studentEmailResults),
  ]);

  const preparationPayload = {
    ...logPayload,
    templateId: preparationTemplate?.id || null,
    eventLabel: 'Preparation instructions',
  };

  const preparationParentLogs = shouldSendPreparation
    ? await createEmailLogs({
        recipients: parentRecipients,
        recipientRole: 'parent',
        subject: preparationSubject,
        eventType: 'PREPARATION_INSTRUCTIONS',
        studentId,
        classId,
        options,
        payload: preparationPayload,
      })
    : [];

  const preparationStudentLogs = shouldSendPreparation
    ? await createEmailLogs({
        recipients: studentRecipients,
        recipientRole: 'student',
        subject: preparationSubject,
        eventType: 'PREPARATION_INSTRUCTIONS',
        studentId,
        classId,
        options,
        payload: preparationPayload,
      })
    : [];

  const preparationParentResults =
    shouldSendPreparation && preparationTemplate && parentRecipients.length > 0
      ? await sendPreparationInstructionsEmail({
          recipients: parentRecipients,
          subject: preparationTemplate.subject,
          body: preparationTemplate.body,
          context: preparationContext,
        })
      : [];

  const preparationStudentResults =
    shouldSendPreparation && preparationTemplate && studentRecipients.length > 0
      ? await sendPreparationInstructionsEmail({
          recipients: studentRecipients,
          subject: preparationTemplate.subject,
          body: preparationTemplate.body,
          context: preparationContext,
        })
      : [];

  await Promise.all([
    updateEmailLogsWithResults(preparationParentLogs, preparationParentResults),
    updateEmailLogsWithResults(preparationStudentLogs, preparationStudentResults),
  ]);

  const successfulParentEmails = parentEmailResults.filter((result) => result.success).length;
  const failedParentEmails = parentEmailResults.filter((result) => !result.success).length;
  const successfulStudentEmails = studentEmailResults.filter((result) => result.success).length;
  const failedStudentEmails = studentEmailResults.filter((result) => !result.success).length;
  const successfulPreparationParentEmails = preparationParentResults.filter((result) => result.success).length;
  const failedPreparationParentEmails = preparationParentResults.filter((result) => !result.success).length;
  const successfulPreparationStudentEmails = preparationStudentResults.filter((result) => result.success).length;
  const failedPreparationStudentEmails = preparationStudentResults.filter((result) => !result.success).length;
  const hasParentRecipient = parentRecipients.length > 0;
  const hasAnyFailure =
    failedParentEmails > 0 ||
    failedStudentEmails > 0 ||
    failedPreparationParentEmails > 0 ||
    failedPreparationStudentEmails > 0;

  if (!hasParentRecipient) {
    console.warn('[EnrollmentNotification] No parent/guardian recipient found.', {
      studentId,
      studentName,
      classId,
      className: classData.name,
    });
  }

  if (hasAnyFailure) {
    console.warn('[EnrollmentNotification] Some assignment emails failed.', {
      studentId,
      classId,
      parentEmailResults,
      studentEmailResults,
      preparationParentResults,
      preparationStudentResults,
    });
  }

  const targetedRecipientSuccess = recipientEmail
    ? mode === 'preparation-only'
      ? successfulPreparationParentEmails + successfulPreparationStudentEmails > 0
      : successfulParentEmails + successfulStudentEmails > 0
    : null;
  const parentRequirementMet = !hasParentRecipient
    ? false
    : mode === 'preparation-only'
    ? successfulPreparationParentEmails > 0
    : successfulParentEmails > 0;
  const deliveryRequirementMet = targetedRecipientSuccess ?? parentRequirementMet;

  return {
    success: deliveryRequirementMet && !hasAnyFailure,
    error: !recipientEmail && !hasParentRecipient ? 'No parent/guardian email is available for this student' : undefined,
    recipients: [...parentRecipients, ...studentRecipients].map((recipient) => ({
      email: recipient.email,
      source: recipient.source,
    })),
    emailsSent: {
      parents: successfulParentEmails,
      students: successfulStudentEmails,
      preparationParents: successfulPreparationParentEmails,
      preparationStudents: successfulPreparationStudentEmails,
    },
    emailsFailed: {
      parents: failedParentEmails,
      students: failedStudentEmails,
      preparationParents: failedPreparationParentEmails,
      preparationStudents: failedPreparationStudentEmails,
    },
    providerResults: {
      parents: parentEmailResults,
      students: studentEmailResults,
      preparationParents: preparationParentResults,
      preparationStudents: preparationStudentResults,
    },
  };
}
