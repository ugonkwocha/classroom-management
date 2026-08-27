# 9jacodekids Academy Portal Blueprint

**Status:** Architecture and implementation blueprint

**Prepared:** August 2026
**Source systems inspected:**

- 9jacodekids Academy Enrollment: `/Users/ugonkwocha/Documents/Academy Enrollment`
- TranscendOS: `/Users/ugonkwocha/Documents/Transcend AI Software Development/transcend-ai-platform`

This document compares the implemented TranscendOS parent, student, and tutor experiences with the current 9jacodekids internal management system. It defines what should be replicated, what should be adapted, the required schema and authentication changes, route and permission boundaries, and a phased implementation plan.

No live-system or production changes are part of this blueprint.

---

## 1. Executive decision

The current 9jacodekids system should remain the operational core. The portals should be added around it, not built as a replacement application and not created by migrating the application to Supabase.

Recommended architecture:

- Keep Next.js, PostgreSQL, Prisma, JWT authentication, the current email infrastructure, and Coolify deployment.
- Retain the existing student, family, guardian, course, program, class, enrollment, payment, and email records.
- Add a multi-role identity layer that can link a user account to a guardian, tutor, and later a student.
- Move toward separate role-specific route families and layouts.
- Enforce access at both the route and record level. Hiding navigation is not authorization.
- Treat `ProgramEnrollment` as the authoritative class-membership source and `Family`/`ParentGuardian` as the authoritative parent-contact source.
- Launch the first student experience as a parent-controlled student area, matching what TranscendOS currently implements. Add independent student login only after consent and age rules are confirmed.

The complete first MVP should include Phases 0 through 3 in this document.

---

## 2. Verified current-state comparison

| Area | TranscendOS implementation | Current 9jacodekids implementation | Blueprint decision |
| --- | --- | --- | --- |
| Application structure | Separate parent, student, tutor, and admin route families and shells | One staff-facing tabbed shell in `app/page.tsx` | Add separate portal route families; preserve the admin shell during migration |
| Authentication | Supabase Auth profiles with a many-to-many `user_roles` table | Local JWT/bcrypt authentication with one `User.role` enum | Keep local auth, but introduce role assignments and profile links |
| Parent identity | `parent_profiles.id` is the authenticated profile ID | `ParentGuardian` has no user relationship | Add optional unique `userId` to `ParentGuardian` |
| Tutor identity | `tutor_profiles.id` is the authenticated profile ID | `Teacher` has no user relationship | Add optional unique `userId` to `Teacher` |
| Student identity | `student_profiles.user_id` is reserved for student auth; current student area also accepts the owning parent session | `Student` has no user relationship or portal status | Add nullable `userId`, login flags, and consent fields; start parent-controlled |
| Family ownership | Parent-to-child relationship is checked for every child portal view | Family and guardian records exist, but all authenticated staff can see broad datasets | Add family-scoped authorization helpers and portal-specific queries |
| Live learning | Cohorts, sessions, meeting URLs, recordings, resources, attendance | Classes have schedule text and one `meetLink`; no session records | Add individual class sessions, recordings, resources, and attendance |
| Assignments | Tutors create class/selected-student assignments; students/parents submit work; tutors give feedback | No assignment or submission models | Add assignment, recipient, submission, attachment, and feedback models |
| Learning progress | Lesson and recording progress are tracked per student | Course history records broad completion only | Add session/recording progress first; lessons later if self-paced courses are introduced |
| Portfolios | Private student portfolio with projects, artifacts, approvals, and controlled sharing | No portfolio model | Add after the core learning workflow is stable |
| Payments | Parent checkout, Stripe, Interac, installments, receipts, refunds | Confirmed registration import, payment proof, payment record, and CRM synchronization | First portal shows existing status/history; do not copy Transcend payment checkout initially |
| Messaging | Parent-tutor, student-tutor, and support conversations with participants and notifications | Email delivery and logs, but no portal conversations | Add moderated class/support messaging after assignment workflow |
| Notifications | In-app notifications plus transactional email | Transactional email and logs | Reuse email layer; add in-app notification records |
| Testing | Extensive Vitest coverage for role, enrollment, learning, and messaging rules | Lint/build pass, but no automated tests were found | Add authorization and workflow tests before portal access is released |

---

## 3. What TranscendOS actually implements

### 3.1 Parent portal

The implemented parent surface includes:

- Family dashboard with child selection, attention items, onboarding steps, upcoming classes, recordings, and assignments.
- Child creation, editing, detail views, attendance summary, enrollment history, payment status, certificates, and portfolio access.
- Family-wide and child-filtered live-class schedules.
- Time-zone-aware class times and controlled join windows.
- Learning Hub with live-class recordings and self-paced course content.
- Assignment viewing, submission, attachment handling, and tutor feedback.
- Program browsing, enrollment, payments, installments, receipts, and refund workflows.
- Portfolios with family approval and controlled sharing.
- Parent-tutor/support messages, notifications, activity history, account settings, and family transfers.

The useful product principle is:

> Parent portal = control, payment, family management, and oversight.

### 3.2 Student area

The implemented student surface includes:

- A focused home page that prioritizes the next live class, open assignment, next class, or latest recording.
- Live Classes.
- Learning Hub with recording and lesson progress.
- Assignments, submissions, attachments, and tutor feedback.
- Student portfolio and project creation.
- Certificates.
- Student-tutor messages that remain visible to the parent and academy team.

Important implementation finding:

- TranscendOS has a real student route family at `/student/[childId]`.
- The current layout authorizes access when the authenticated profile is either the student's owning parent or the student's linked `user_id`.
- The database contains `login_enabled` and `parent_controlled_access` fields.
- However, no completed activation flow for independent student accounts was found. The current working experience is primarily a parent-authenticated, child-specific student area.

Therefore, 9jacodekids should replicate the parent-controlled student area first. Independent student login should not be presented as part of the initial MVP.

### 3.3 Tutor portal

The implemented tutor surface includes:

- Invitation and onboarding flow.
- Active/deactivated account enforcement.
- Teaching dashboard with today's sessions and items needing attention.
- Assigned classes and class workspaces.
- Assigned session schedule and controlled class joining.
- Roster access limited to assigned classes.
- Attendance marking.
- Multiple recordings and session resources.
- Class-wide or selected-student assignments.
- Assignment templates.
- Submission review and tutor feedback queue.
- Student progress snapshots and portfolio access for assigned learners.
- Tutor-parent/student messaging, notifications, materials, and account settings.

The strongest implementation pattern is object-level authorization. For example, a tutor action first proves that the current user is assigned to the relevant session or class before permitting attendance, assignment, recording, or feedback changes.

---

## 4. Features to replicate

### Parent portal MVP

Replicate these patterns directly at the product level:

1. A separate parent shell and navigation.
2. Family dashboard with a child selector.
3. A selected-child snapshot showing:
   - enrollment and payment status;
   - assigned class and tutor;
   - next class and Meet link;
   - assignments needing attention;
   - recent tutor feedback;
   - attendance summary after attendance is implemented.
4. My Children directory and child detail pages.
5. Live Classes page with child filters and time-zone-aware schedules.
6. Learning Hub for recordings and course/session resources.
7. Assignment view and submission workflow.
8. Read-only payment and enrollment history using the existing payment records.
9. Notifications and account settings.
10. Parent-controlled launch into a child-specific student area.

### Student area MVP

Replicate:

1. A separate, simple child-focused shell.
2. Home page answering:
   - What class is next?
   - What should I do now?
   - Is there a recording to watch?
   - Is an assignment due?
3. Live Classes.
4. Learning Hub.
5. Assignments and submissions.
6. Tutor feedback.
7. Parent-visible student messaging, when messaging is introduced.

### Tutor portal MVP

Replicate:

1. Staff-issued tutor invitations and onboarding.
2. Tutor dashboard with next session and attention queue.
3. My Classes and My Sessions.
4. Class roster scoped to assigned classes.
5. Attendance entry.
6. Recording and resource management.
7. Assignment creation, editing, audience selection, and templates.
8. Submission review and feedback.
9. Student learning snapshot for assigned learners.
10. Notifications and account settings.

### Cross-cutting patterns

Replicate:

- Separate layouts and navigation by role.
- Server-side ownership checks for every protected record.
- A reusable notification system backed by email delivery.
- Time-zone-aware session display.
- Action-focused dashboards instead of data-heavy admin screens.
- Empty, loading, error, and deactivated-account states.
- Tests for authorization boundaries and business rules.

---

## 5. Features to adapt for 9jacodekids

### 5.1 Keep the existing technology stack

Do not copy TranscendOS's Supabase implementation. Use its product and authorization patterns while retaining:

- Prisma and PostgreSQL;
- the current JWT/bcrypt session system;
- REST API routes and SWR where they remain appropriate;
- the current email provider fallback and delivery logs;
- Coolify staging and production.

### 5.2 Adapt the academic model

TranscendOS uses programs, cohorts, and sessions. 9jacodekids currently uses programs, classes, batches, and slots.

Recommended mapping:

| TranscendOS | 9jacodekids |
| --- | --- |
| Program | `Program` |
| Cohort | Existing `Class` |
| Session | New `ClassSession` |
| Enrollment | Existing `ProgramEnrollment` |
| Tutor profile | Existing `Teacher`, linked to `User` |

Do not create a second cohort concept. The existing `Class` already represents the teaching group.

### 5.3 Adapt payment functionality

The first parent portal should expose:

- enrollment status;
- payment status;
- confirmed amounts;
- uploaded proof metadata where appropriate;
- academy support instructions.

It should not initially copy:

- Stripe checkout;
- Interac seat holds;
- installment automation;
- refund workflows.

Those would require separate product and policy decisions. Current WordPress/Fluent Forms and FluentCRM workflows remain authoritative until explicitly replaced.

### 5.4 Adapt student access for ages 6–16

9jacodekids serves ages 6–16, including younger learners. The first release should use parent-controlled student access.

Recommended initial behavior:

- Parent signs in.
- Parent chooses a child.
- Parent opens `/student/[studentId]` on the child's device or browser tab.
- The child sees only that student's learning data.
- Returning to family management requires navigating back to the parent portal.

Independent student login, age eligibility, consent, and recovery behavior are **Needs confirmation** before implementation.

### 5.5 Adapt the learning experience to coding classes

Assignments should support:

- text instructions;
- project URLs;
- file uploads;
- screenshots;
- links to coding platforms;
- optional points or rubric feedback;
- individual or full-class assignment audiences.

Exact supported file types, maximum size, storage provider, and external coding-platform policy are **Needs confirmation**.

### 5.6 Defer lower-priority TranscendOS features

Do not place these in the first MVP:

- online checkout replacement;
- refunds and installment management;
- family transfer workflow;
- public/unlisted portfolio sharing;
- self-paced LMS authoring;
- advanced certificates;
- independent child login;
- multi-language support;
- mobile application.

---

## 6. Target identity and authentication architecture

### 6.1 Why the current role enum is insufficient

The current `User.role` supports only `SUPERADMIN`, `ADMIN`, and `STAFF`. Adding parent, tutor, and student values to the enum would work temporarily, but it would prevent legitimate multi-role accounts, such as a staff member who is also a parent or a tutor who is also a parent.

Recommended additive model:

```prisma
model Role {
  slug        String   @id
  label       String
  description String?
  assignments UserRoleAssignment[]
}

model UserRoleAssignment {
  userId    String
  roleSlug  String
  grantedBy String?
  grantedAt DateTime @default(now())

  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role   @relation(fields: [roleSlug], references: [slug], onDelete: Restrict)

  @@id([userId, roleSlug])
  @@index([roleSlug])
}
```

Seed roles:

- `superadmin`
- `admin`
- `staff`
- `parent`
- `tutor`
- `student`

Migration approach:

1. Add the new tables without removing `User.role`.
2. Backfill one role assignment for every existing user.
3. Make permission checks read role assignments.
4. Keep `User.role` as a compatibility field during the portal rollout.
5. Remove or rename the legacy field only after all routes and scripts are migrated.

### 6.2 Link authenticated users to business records

Add nullable links. A tutor and an independent student account map one-to-one, while a guardian user may have guardian records in more than one family:

```prisma
model ParentGuardian {
  // existing fields
  userId String?
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
}

model Teacher {
  // existing fields
  userId String? @unique
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
}

model Student {
  // existing fields
  userId                   String?   @unique
  loginEnabled             Boolean   @default(false)
  parentControlledAccess   Boolean   @default(true)
  loginConsentAt           DateTime?
  loginConsentByUserId     String?
  user                     User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

For the first MVP, `Student.userId` remains null and `loginEnabled` remains false.

### 6.3 Invitation flows

Reuse the existing `UserInvitation` foundation but extend it to support a target profile:

- Guardian invitation links to one `ParentGuardian`.
- Tutor invitation links to one `Teacher`.
- Staff invitation continues to create internal roles.
- Student invitation is reserved for a later phase.

Invitation acceptance must:

1. Verify the hashed, unexpired, unrevoked token.
2. Require the invited email.
3. Create or link the `User`.
4. Add the correct role assignment.
5. Link the target guardian or tutor record.
6. Increment `tokenVersion` when role or account status changes.
7. Redirect to the correct portal.

### 6.4 Session changes

Keep the secure HTTP-only cookie. Change the JWT payload to treat `userId` and `tokenVersion` as the stable security claims. Role assignments and record ownership should be refreshed from the database for protected actions.

Do not rely on a role stored only in an old JWT after a user's access changes.

### 6.5 Required access helpers

Create server-only helpers with narrow responsibilities:

```text
requireAuthenticatedUser(request)
requireAnyRole(userId, allowedRoles)
requireParentGuardian(userId)
requireFamilyAccess(userId, familyId)
requireStudentAccess(userId, studentId)
requireTutorProfile(userId)
requireTutorClassAccess(userId, classId)
requireTutorSessionAccess(userId, sessionId)
requireStaffPermission(userId, permission)
```

Every API that accepts a family, student, class, session, assignment, submission, or message ID must use the matching record-level helper.

---

## 7. Data-model changes

### 7.1 Resolve existing duplicate sources of truth

Before portal launch:

1. Treat `ProgramEnrollment` as the authoritative relationship between a student and a class.
2. Stop using `Class.students` for writes.
3. Backfill or verify enrollment records for every ID currently stored in `Class.students`.
4. Remove `Class.students` only after read paths are migrated and verified.
5. Treat `Family` and `ParentGuardian` as the authoritative family-contact model.
6. Keep `Student.parentEmail`, `parentPhone`, and `parentPhoneCountryCode` as compatibility fields during migration, then remove them after all imports, forms, email recipients, and reports use guardians.

### 7.2 Normalize tutor qualifications

Replace `Teacher.qualifiedCourses String[]` with a relation when the tutor portal is introduced:

```prisma
model TutorCourseQualification {
  teacherId String
  courseId  String
  active    Boolean @default(true)

  teacher Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  course  Course  @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@id([teacherId, courseId])
}
```

### 7.3 Add scheduled class sessions

```prisma
model ClassSession {
  id             String             @id @default(cuid())
  classId        String
  title          String
  startAt        DateTime
  endAt          DateTime
  timezone       String
  status         ClassSessionStatus @default(SCHEDULED)
  meetingUrl     String?
  earlyJoinAt    DateTime?
  teacherId      String?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  class          Class              @relation(fields: [classId], references: [id], onDelete: Cascade)
  teacher        Teacher?           @relation(fields: [teacherId], references: [id], onDelete: SetNull)
  attendance     AttendanceRecord[]
  recordings     SessionRecording[]
  resources      SessionResource[]

  @@index([classId, startAt])
  @@index([teacherId, startAt])
}

enum ClassSessionStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}
```

`Class.meetLink` can remain the default class link. `ClassSession.meetingUrl` is an optional per-session override.

### 7.4 Add attendance

```prisma
model AttendanceRecord {
  id          String           @id @default(cuid())
  sessionId   String
  studentId   String
  status      AttendanceStatus
  notes       String?
  markedById  String
  markedAt    DateTime         @default(now())

  session     ClassSession     @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  student     Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  markedBy    User             @relation(fields: [markedById], references: [id], onDelete: Restrict)

  @@unique([sessionId, studentId])
  @@index([studentId, markedAt])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  EXCUSED
}
```

### 7.5 Add recordings and session resources

Use separate records rather than adding more arrays or columns to `Class`:

- `SessionRecording`: session, title, URL, notes, position, addedBy, timestamps.
- `SessionResource`: session, type, title, URL or protected file path, instructions, position, addedBy.
- `StudentSessionProgress`: student, session, recording, completed/watched timestamp.

Allow multiple recordings and resources per session.

### 7.6 Add assignments and submissions

Required models:

- `Assignment`
  - class, creator, audience, title, sanitized description, due date, points, status.
- `AssignmentRecipient`
  - assignment and student for selected-student assignments.
- `Submission`
  - assignment, student, submitting user, text response, project URL, status, tutor feedback, score, feedback timestamp.
- `SubmissionAttachment`
  - submission, original filename, MIME type, size, storage path, uploader.
- `AssignmentTemplate`
  - tutor, title, description, points, active state.

Recommended enums:

```text
AssignmentAudience: ALL_CLASS, SELECTED_STUDENTS
AssignmentStatus: DRAFT, PUBLISHED, ARCHIVED
SubmissionStatus: DRAFT, SUBMITTED, REVIEWED, REVISION_REQUESTED
```

Authorization invariants:

- A tutor may manage an assignment only for an assigned class.
- A selected recipient must be actively enrolled in that class.
- A parent may submit only for a student in their family.
- A student account may submit only for its linked student.
- A tutor may review only submissions from an assigned class.

### 7.7 Add communication and notification records

After the learning workflow is stable, add:

- `Notification` with user, type, title, body, action URL, read timestamp.
- `ConversationThread` with class/support context, status, and timestamps.
- `ConversationParticipant` with user, participant role, and optional student context.
- `ConversationMessage` with sender, body, timestamps, and moderation metadata.

Student messages must remain visible to the linked guardian and authorized academy staff.

### 7.8 Add portfolios and certificates later

Portal expansion models:

- `StudentPortfolio`
- `PortfolioProject`
- `PortfolioArtifact`
- `PortfolioApproval`
- `Certificate`

Start with private portfolios. Public or unlisted sharing requires separate consent, privacy, moderation, revocation, and storage decisions.

### 7.9 Add audit records

Add an append-only `AuditLog` for sensitive actions:

- role grants and removals;
- invitation and account activation;
- parent/student/tutor profile links;
- payment-status changes;
- attendance changes;
- assignment publication/deletion;
- tutor feedback;
- file access and removal;
- family merges;
- student access enable/disable.

---

## 8. Proposed route architecture

### 8.1 Existing staff/admin surface

Short term:

```text
/                 Existing staff/admin application
/login            Shared login
/accept-invite    Shared invitation acceptance
/reset-password   Shared password reset
```

Later, move the staff surface under `/admin` only if the migration benefit outweighs the risk. The route move is not required for the parent/tutor MVP.

### 8.2 Parent routes

```text
/parent/dashboard
/parent/children
/parent/children/[studentId]
/parent/classes
/parent/classes/[classId]
/parent/learning
/parent/learning/[studentId]
/parent/assignments
/parent/children/[studentId]/assignments/[assignmentId]
/parent/payments
/parent/notifications
/parent/messages
/parent/messages/[threadId]
/parent/account
```

### 8.3 Parent-controlled student routes

```text
/student
/student/[studentId]
/student/[studentId]/classes
/student/[studentId]/learning
/student/[studentId]/assignments
/student/[studentId]/assignments/[assignmentId]
/student/[studentId]/messages
/student/[studentId]/portfolio        Later phase
```

The `[studentId]` layout must call `requireStudentAccess()` before rendering any child content.

### 8.4 Tutor routes

```text
/tutor/setup
/tutor/dashboard
/tutor/classes
/tutor/classes/[classId]
/tutor/sessions
/tutor/sessions/[sessionId]
/tutor/feedback
/tutor/students/[studentId]
/tutor/materials
/tutor/messages
/tutor/messages/[threadId]
/tutor/notifications
/tutor/account
```

### 8.5 Portal API namespaces

Preserve the existing API routes for staff screens. Add portal-specific read models instead of exposing the broad staff endpoints to parents or tutors:

```text
/api/portal/parent/dashboard
/api/portal/parent/children
/api/portal/parent/classes
/api/portal/parent/assignments
/api/portal/parent/payments

/api/portal/student/[studentId]/dashboard
/api/portal/student/[studentId]/classes
/api/portal/student/[studentId]/learning
/api/portal/student/[studentId]/assignments

/api/portal/tutor/dashboard
/api/portal/tutor/classes
/api/portal/tutor/classes/[classId]
/api/portal/tutor/sessions/[sessionId]
/api/portal/tutor/feedback
```

Portal endpoints should return purpose-built, minimum-necessary view models. Do not return entire internal student, family, payment, or tutor records.

---

## 9. Permission and record-scope blueprint

Legend:

- `All` means academy-wide access subject to the current internal permission.
- `Family` means records belonging to the authenticated guardian's family.
- `Self` means the linked student only.
- `Assigned` means classes, sessions, and students assigned to the tutor.
- `No` means the operation is unavailable.

| Capability | Superadmin/Admin | Staff | Parent | Student | Tutor |
| --- | --- | --- | --- | --- | --- |
| View students | All | All | Family | Self | Assigned |
| Edit student identity | All | All | Limited family fields | No | No |
| View family/guardians | All | All | Own family | No | Minimal contact only when required |
| Create/manage enrollments | All | All | No in MVP | No | No |
| View enrollments | All | All | Family | Self | Assigned class summary |
| View payment status/history | All | As permitted | Family | No | No |
| Change payment status | As permitted | As permitted | No | No | No |
| View class schedule/Meet link | All | All | Family | Self | Assigned |
| Manage class/session | All | As permitted | No | No | Assigned session fields only |
| Mark attendance | All | As permitted | No | No | Assigned |
| View attendance | All | All | Family | Self | Assigned |
| Create assignments | All | As permitted | No | No | Assigned |
| Submit assignment | Support override | Support override | Family | Self | No |
| Review/give feedback | All | As permitted | No | No | Assigned |
| View recordings/resources | All | All | Family with active/history access | Self with access | Assigned |
| Manage recordings/resources | All | As permitted | No | No | Assigned |
| Send portal messages | All | As permitted | Authorized threads | Authorized threads | Assigned/support threads |
| Manage roles/users | As permitted | No | No | No | No |

Additional rules:

1. Tutors must not see payment proofs, revenue, parent marketing data, or unrelated family records.
2. Parents must not see staff notes, other families, or internal financial/CRM metadata.
3. Students must not see billing, family administration, sibling records, or internal notes.
4. Suspended or inactive accounts lose portal access immediately through database-backed checks and token invalidation.
5. Every write must be re-authorized on the server even if the page was already authorized.

---

## 10. Phased MVP implementation plan

## Phase 0: Foundation and data integrity

Goal: make the existing system safe to expose to non-staff users.

Deliverables:

1. Add `Role` and `UserRoleAssignment`; backfill current staff roles.
2. Add `userId` links to guardians and tutors.
3. Extend invitations for guardian and tutor onboarding.
4. Implement route and record-scope access helpers.
5. Define minimum portal view models.
6. Make `ProgramEnrollment` the single class-membership source.
7. Begin migration from legacy student parent-contact fields to guardians.
8. Add audit logging for identity and authorization changes.
9. Add automated tests for authentication, role assignment, family ownership, tutor assignment, and cross-family denial.

Exit gate:

- Existing staff functionality still passes lint/build and regression tests.
- Current users retain their permissions.
- A guardian cannot read another family by changing an ID.
- A tutor cannot read an unassigned class or student by changing an ID.
- Invitations cannot be reused after acceptance or expiry.

## Phase 1: Read-only parent portal

Goal: give parents useful visibility without changing enrollment or payment operations.

Deliverables:

1. Parent invitation, login, logout, password reset, and account status.
2. Parent layout and dashboard.
3. Child selector and child detail.
4. Enrollment, payment-status, class, tutor, schedule, and Meet-link visibility.
5. Time-zone-aware class display.
6. Read-only payment history from existing payment records.
7. Parent notifications for class assignment and schedule changes.
8. Parent-controlled launch into the student area shell.

Exit gate:

- A parent sees only students in the family linked through their `ParentGuardian` record.
- Sibling families display correctly.
- No internal CRM fields, payment-proof storage paths, staff claims, revenue totals, or unrelated contacts are exposed.
- Existing class-assignment emails and staff screens continue to work.

## Phase 2: Tutor portal and live-learning core

Goal: let tutors deliver classes inside the system.

Deliverables:

1. Tutor invitation, setup, deactivation, and account page.
2. `ClassSession`, attendance, recordings, and resources.
3. Tutor dashboard, My Classes, My Sessions, and roster.
4. Attendance workflow.
5. Assignment, selected-recipient, template, submission, and attachment models.
6. Assignment creation and publication.
7. Submission review and feedback queue.
8. Email/in-app notifications for new assignments, recordings, and feedback.

Exit gate:

- Tutor writes are limited to assigned classes and sessions.
- Roster membership comes from active class enrollments.
- Attendance is unique per student/session.
- Assignment recipients must belong to the class.
- Files are private and authorized before download.

## Phase 3: Student participation MVP

Goal: give students a calm, parent-controlled learning workspace.

Deliverables:

1. Student home with next-action priority.
2. Live Classes and Meet-link join rules.
3. Learning Hub with recordings/resources.
4. Assignment list and detail.
5. Parent/student submission and attachment workflow.
6. Tutor feedback display.
7. Basic recording/session progress.
8. Parent oversight of all student activity.

Exit gate:

- A parent session can launch only children in its family.
- Student pages contain no family billing or internal operations.
- Submission writes are limited to the selected student and assigned work.
- Parents can see the same submission and feedback state.

**Phases 0–3 constitute the recommended first complete MVP.**

## Phase 4: Communication, portfolios, and certificates

Goal: deepen the family learning record after the core workflow is reliable.

Deliverables:

1. Parent-tutor and student-tutor conversations.
2. Moderation and academy visibility.
3. Private student portfolios.
4. Assignment-to-portfolio conversion and standalone projects.
5. Parent approval workflow.
6. Certificates tied to confirmed course completion.

Exit gate:

- Student messages are parent/staff visible.
- Portfolio defaults are private.
- Sharing can be revoked.
- Certificates are traceable to a completion record.

## Phase 5: Independent student accounts and portal commerce

Goal: add higher-risk self-service features only after policies are confirmed.

Possible deliverables:

1. Parent-approved student account activation.
2. Age/consent rules and access revocation.
3. Student login recovery and device/session controls.
4. Self-service parent enrollment or payments.
5. Receipts, installment handling, cancellation, and refund request workflows.

This phase requires explicit decisions on child privacy, age eligibility, consent, payment providers, currencies, taxes, refunds, and enrollment policies.

---

## 11. Testing and verification strategy

Add Vitest or an equivalent automated test runner before portal release.

Minimum test suites:

1. Role assignment and redirect behavior.
2. Invitation expiry, revocation, reuse, and email matching.
3. Parent-family ownership.
4. Student self/parent access.
5. Tutor assigned-class and assigned-session access.
6. Cross-family and cross-class denial cases.
7. Enrollment-derived roster membership.
8. Attendance uniqueness and eligibility.
9. Assignment audience and recipient validation.
10. Submission ownership and feedback authorization.
11. Private attachment authorization.
12. Notification recipient resolution.
13. Legacy staff-screen regressions.
14. Migration/backfill integrity.

Verification for each phase:

- `npm run lint`
- automated tests
- `npm run build`
- migration applied to staging database
- staging role matrix exercised with separate staff, parent, tutor, and parent-controlled student scenarios
- desktop and mobile checks
- direct-ID access tests proving unauthorized records return 403 or 404
- no production promotion without explicit approval

---

## 12. Decisions needed before implementation

These do not block architectural preparation, but they must be confirmed before the affected feature is released:

1. Are parent accounts invitation-only initially, or can parents self-register?
2. Which existing guardian should receive the first portal invitation when a family has multiple guardians?
3. Can every active guardian see every child and payment in the family, or are per-child access restrictions needed?
4. What student ages can eventually receive independent login?
5. What exact parental consent must be recorded for student login, messaging, recordings, and portfolio sharing?
6. Which file types, storage provider, and file-size limits should submissions support?
7. Can tutors message students directly, and what moderation/retention rules apply?
8. Should parents see payment proof files or only verified payment summaries?
9. Will portal enrollment/payment continue through WordPress initially?
10. Which currencies and tax wording are required if portal payments are introduced?
11. Who can issue certificates and what qualifies as completion?
12. Should parents be able to edit child identity details after enrollment, or request staff approval?

---

## 13. Recommended first implementation slice

The safest first coding slice is Phase 0 identity groundwork only:

1. Add role-assignment tables.
2. Backfill current staff roles.
3. Add guardian/tutor user links.
4. Add reusable authorization helpers and tests.
5. Extend invitations without yet exposing a parent or tutor portal.

This creates the security foundation every later screen depends on while preserving the current staff application and deployment model.

---

## 14. Source evidence reviewed

### 9jacodekids

- `prisma/schema.prisma`
- `lib/auth.ts`
- `lib/permissions.ts`
- `lib/family-server.ts`
- `lib/tutor-roster.ts`
- `lib/class-scheduling.ts`
- `app/page.tsx`
- `app/api/**`
- `components/**`
- `PRD.md`
- `README.md`

### TranscendOS

- `proxy.ts`
- `lib/auth/**`
- `lib/queries/parent-dashboard.ts`
- `lib/queries/parent-children.ts`
- `lib/queries/child-portal.ts`
- `lib/queries/tutor.ts`
- `lib/tutor/actions.ts`
- `lib/parent/actions.ts`
- `lib/messages/**`
- `lib/portfolio/**`
- `app/(parent)/**`
- `app/student/**`
- `app/tutor/**`
- `components/layout/**`
- `supabase/migrations/0001_profiles.sql`
- `supabase/migrations/0002_parent_student.sql`
- `supabase/migrations/0003_roles.sql`
- `supabase/migrations/0004_rls.sql`
- `supabase/migrations/0012_phase1d.sql`
- `supabase/migrations/0017_learning_system.sql`
- `supabase/migrations/0034_soc2_rls_hardening.sql`
- later assignment, messaging, portfolio, notification, certificate, and access-hardening migrations

The implementation code and database migrations were treated as authoritative where planning documents described future behavior that was not yet fully wired.
