export type ProgramLevel = string;
export type ProgramType = 'WEEKEND_CLUB' | 'HOLIDAY_CAMP';
export type Season = 'JANUARY' | 'EASTER' | 'MAY' | 'SUMMER' | 'OCTOBER';
export type TeacherStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'STAFF';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
export type PriceType = 'FULL_PRICE' | 'SIBLING_DISCOUNT' | 'EARLY_BIRD';
export type GuardianRelationship = 'PARENT' | 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';
export type EmailEventType =
  | 'CLASS_ASSIGNMENT'
  | 'PREPARATION_INSTRUCTIONS'
  | 'TEACHER_ASSIGNMENT'
  | 'USER_INVITATION'
  | 'PASSWORD_RESET';
export type EmailLogStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'DELIVERED' | 'BOUNCED';
export type RegistrationImportSource = 'FLUENT_FORM_IMPORT' | 'EXISTING_FAMILY';
export type ConfirmedRegistrationImportStatus = 'PROCESSED' | 'NEEDS_REVIEW' | 'FAILED';
export type CrmSyncStatus = 'PENDING' | 'SYNCED' | 'FAILED' | 'SKIPPED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string | null;
  invitedBy?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  eventType: EmailEventType;
  status: EmailLogStatus;
  recipientEmail: string;
  recipientName?: string | null;
  recipientRole?: string | null;
  subject?: string | null;
  provider: string;
  providerMessageId?: string | null;
  error?: string | null;
  studentId?: string | null;
  classId?: string | null;
  enrollmentId?: string | null;
  triggeredById?: string | null;
  payload?: unknown;
  sentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  programLevels: ProgramLevel[];
  emailTemplate?: CourseEmailTemplate | null;
  createdAt: string;
}

export interface CourseEmailTemplate {
  id: string;
  courseId: string;
  subject: string;
  body: string;
  isActive: boolean;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
  course?: Course;
}

export interface ProgramLevelSetting {
  id?: string;
  level: ProgramLevel;
  displayName: string;
  ageRange?: string | null;
  description?: string | null;
  sortOrder: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  season: Season;
  year: number;
  batches: number;
  slots: string[];
  startDate: string;
  createdAt: string;
}

export interface FluentFormMapping {
  id: string;
  formId: string;
  formName: string;
  programId: string;
  defaultBatch: number;
  defaultPriceType: PriceType;
  leadTag?: string | null;
  paidTag: string;
  removeLeadTagOnPaid: boolean;
  isActive: boolean;
  program?: Program;
  optionMappings?: FluentFormOptionMapping[];
  createdAt: string;
  updatedAt: string;
}

export interface FluentFormOptionMapping {
  id?: string;
  formMappingId?: string;
  sourceOptionText: string;
  batchNumber: number;
  paidTag?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Course history entry for tracking courses student has taken
export interface CourseHistory {
  id: string;
  courseId: string;
  courseName: string; // for quick reference
  programId?: string | null;
  programName?: string | null;
  batch?: number;
  year?: number;
  completionStatus: 'COMPLETED' | 'IN_PROGRESS';
  startDate?: string;
  endDate?: string;
  performanceNotes?: string;
  dateAdded: string;
}

// Program enrollment entry for tracking student's enrollment in each program
export interface ProgramEnrollment {
  id: string;
  programId: string;
  batchNumber: number;
  classId?: string; // May not be assigned immediately (waitlist)
  enrollmentDate: string;
  status: 'WAITLIST' | 'ASSIGNED' | 'COMPLETED' | 'DROPPED';
  paymentStatus?: 'PENDING' | 'CONFIRMED' | 'COMPLETED'; // Program-specific payment status
  priceType?: PriceType; // Pricing option selected
  priceAmount?: number; // Amount paid in Naira
  claimedById?: string | null;
  claimExpiresAt?: string | null;
  claimedBy?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'> | null;
  program?: Program;
  class?: Class | null;
}

// Pricing option for enrollment
export interface PriceOption {
  type: PriceType;
  label: string;
  amount: number;
  description: string;
}

// Pricing configuration for super admin management
export interface PricingConfig {
  id: string;
  priceType: PriceType;
  amount: number;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParentGuardian {
  id: string;
  familyId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  emailNormalized?: string | null;
  phone?: string | null;
  phoneNormalized?: string | null;
  phoneCountryCode?: string | null;
  relationship: GuardianRelationship;
  isPrimary: boolean;
  isActive: boolean;
  needsReview: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Family {
  id: string;
  displayName: string;
  isArchived: boolean;
  guardians: ParentGuardian[];
  students?: Student[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProof {
  id: string;
  importId?: string | null;
  paymentRecordId?: string | null;
  enrollmentId?: string | null;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  note?: string | null;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentPaymentRecord {
  id: string;
  source: RegistrationImportSource;
  familyId: string;
  studentId: string;
  enrollmentId: string;
  importId?: string | null;
  amountConfirmed: number;
  paymentProofNote?: string | null;
  crmSyncStatus: CrmSyncStatus;
  crmContactId?: string | null;
  crmTag?: string | null;
  crmError?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: Student;
  enrollment?: ProgramEnrollment;
}

export interface ConfirmedRegistrationImportChild {
  id: string;
  importId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  dateOfBirth?: string | null;
  courseId?: string | null;
  programId: string;
  batchNumber: number;
  priceType: PriceType;
  priceAmount: number;
  studentId?: string | null;
  enrollmentId?: string | null;
  student?: Student | null;
  program?: Program;
  course?: Course | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmedRegistrationImport {
  id: string;
  source: RegistrationImportSource;
  sourceFormId?: string | null;
  sourceSubmissionId?: string | null;
  formMappingId?: string | null;
  parentFirstName: string;
  parentLastName: string;
  parentEmail?: string | null;
  parentPhone?: string | null;
  parentPhoneCountryCode?: string | null;
  programId: string;
  defaultBatch: number;
  expectedAmount?: number | null;
  confirmedAmount: number;
  paymentProofNote?: string | null;
  status: ConfirmedRegistrationImportStatus;
  crmSyncStatus: CrmSyncStatus;
  crmContactId?: string | null;
  crmTag?: string | null;
  crmError?: string | null;
  familyId?: string | null;
  family?: Family | null;
  program?: Program;
  children?: ConfirmedRegistrationImportChild[];
  paymentRecords?: EnrollmentPaymentRecord[];
  paymentProofs?: PaymentProof[];
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode?: string; // Country code for student phone (e.g., 'NG', 'US')
  parentEmail?: string;
  parentPhone?: string;
  parentPhoneCountryCode?: string; // Country code for parent phone
  familyId?: string | null;
  family?: Family | null;
  dateOfBirth?: string;
  isReturningStudent: boolean;
  courseHistory: CourseHistory[]; // Past courses taken
  enrollments: ProgramEnrollment[]; // Current & past program enrollments
  programEnrollments?: ProgramEnrollment[]; // Alias for backwards compatibility in forms
  paymentStatus: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
  createdAt: string;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio?: string;
  profilePhoto?: string;
  status: TeacherStatus;
  qualifiedCourses: string[]; // Array of course IDs
  createdAt: string;
}

export interface Class {
  id: string;
  name: string;
  courseId: string;
  programId: string;
  programLevel: ProgramLevel;
  batch: number;
  slot: string;
  schedule: string;
  students: string[];
  capacity: number;
  teacherId?: string; // Optional: tutors can be assigned later
  meetLink?: string | null;
  isArchived: boolean; // Archive instead of delete (default: false)
  createdAt: string;
  course?: Course;
  program?: Program;
  teacher?: Teacher | null;
}

export interface Stats {
  totalStudents: number;
  totalClasses: number;
  totalEnrolled: number;
  waitlistCount: number;
  classCapacityPercentage: number;
}
