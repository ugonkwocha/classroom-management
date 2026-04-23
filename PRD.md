# Academy Enrollment Management System - Product Requirements Document (PRD)

**Project Name:** 9jacodekids Academy Enrollment Management System
**Version:** 1.0
**Last Updated:** March 2026
**Status:** In Development / Deployed

---

## 1. Executive Summary

The 9jacodekids Academy Enrollment Management System is a comprehensive web-based application designed to manage student enrollments, program assignments, course history, and financial operations for an educational academy. The system provides role-based access control, multi-country phone number support, dynamic pricing management, and detailed analytics for academy administrators.

---

## 2. Product Overview

### 2.1 Purpose
To streamline the management of student enrollments in academy programs, track student progress through courses, manage class assignments, monitor financial transactions, and provide real-time analytics to administrators.

### 2.2 Key Benefits
- Centralized student management system
- Multi-country phone number support with proper validation
- Real-time dashboard analytics and insights
- Role-based access control for different user types
- Dynamic pricing configuration by superadmins
- Comprehensive student profile tracking
- Program and class assignment management
- Course history tracking
- Financial status monitoring

### 2.3 Target Users
- **Superadmins:** Full system access, pricing configuration, all management features
- **Admins:** Student management, enrollments, class assignments, analytics
- **Staff:** View-only or limited editing access

---

## 3. Core Features

### 3.1 Dashboard
**Purpose:** Provide academy administrators with real-time overview of operations

**Key Metrics Displayed:**
- Summary statistics (total students, total enrolled, waitlist count, class capacity)
- Program & year analytics with distribution charts
- Financial metrics including revenue analytics and forecasts
- Discount analysis
- Year-over-year comparisons
- Program comparison analytics
- Deeper insights and trend analysis

**Components:**
- Program Distribution (pie/bar charts)
- Revenue Analytics (trend analysis)
- Revenue Forecast (projected revenue)
- Discount Analysis (discount distribution)
- YearOverYear Comparison
- Program Comparison
- Program History Comparison
- Quick stats (unassigned students, class availability)

### 3.2 Student Management
**Purpose:** Create, read, update, and delete student records with comprehensive enrollment tracking

**Features:**
- Create new students
- View student details with all enrollment information
- Edit student profiles
- Search and filter students by name or email
- View complete course history
- Track program enrollments with status
- Delete students (with confirmation)

**Student Profile Fields:**
- First Name (required)
- Last Name (required)
- Email (unique, optional)
- Phone Number (unique, optional with country code support)
- Phone Country Code (e.g., 'NG', 'US', 'CA')
- Date of Birth (optional)
- Parent/Guardian Email (unique, optional)
- Parent/Guardian Phone (unique, optional with country code support)
- Parent Phone Country Code
- Is Returning Student (boolean)
- Payment Status (PENDING, CONFIRMED, COMPLETED)
- Course History (array of past courses)
- Program Enrollments (array of current/past enrollments)

**Validations:**
- Student and parent cannot have same email
- Student and parent cannot have same phone number
- Email must be unique across all students
- Phone must be unique across all students
- Parent email must be unique across all parents
- Parent phone must be unique across all parents
- Country-specific phone number format validation

### 3.3 Program Enrollment
**Purpose:** Manage student enrollments in academy programs with batch and pricing options

**Features:**
- Enroll students in multiple programs
- Select multiple batches per program
- Choose pricing tier per batch (Full Price, Sibling Discount, Early Bird)
- Track enrollment status (ASSIGNED, WAITLIST, COMPLETED, DROPPED)
- View enrollment history and payment status
- Create and manage course history within enrollments

**Enrollment Status Values:**
- ASSIGNED: Student assigned to a class
- WAITLIST: Student on waiting list for a class
- COMPLETED: Program completion recorded
- DROPPED: Student dropped from program

**Payment Status Values:**
- PENDING: Payment not yet received
- CONFIRMED: Payment confirmed
- COMPLETED: Payment fully processed

**Pricing Types:**
- FULL_PRICE: Standard full price
- SIBLING_DISCOUNT: Discounted price for siblings
- EARLY_BIRD: Early registration discount

### 3.4 Class Assignment
**Purpose:** Assign enrolled students to specific classes within programs

**Features:**
- Browse available classes with capacity information
- View class details (course, program, level, batch, schedule, teacher)
- Assign students to classes
- Track class capacity and availability
- Waitlist management

**Class Information:**
- Class Name (unique)
- Course (linked to course)
- Program (linked to program)
- Program Level (CREATORS, INNOVATORS, INVENTORS)
- Batch Number
- Time Slot
- Schedule Details
- Student Capacity
- Assigned Teacher (optional)
- Is Archived (for historical tracking)

### 3.5 Pricing Management
**Purpose:** Configure and manage dynamic pricing for different enrollment types

**Features:**
- Set prices for Full Price, Sibling Discount, and Early Bird options
- View current pricing configuration
- Update prices in real-time
- **Access Control:** Superadmin only

**Pricing Configuration Fields:**
- Price Type (enum: FULL_PRICE, SIBLING_DISCOUNT, EARLY_BIRD)
- Amount (in Naira)
- Updated By (user who made the change)
- Created At / Updated At (timestamps)

**UI Placement:**
- Dedicated "Pricing" tab in main navigation
- Only visible to superadmin users
- Separate from dashboard for better UX

### 3.6 Phone Number System
**Purpose:** Support international phone numbers with proper validation and formatting

#### 3.6.1 Supported Countries (80+)

**Tier 1: Strict Validation (10 countries)**
- Nigeria (NG): +234, pattern: /^(?:\+234|0)[0-9]{10}$/, format: +234 XXX XXX XXXX
- United States (US): +1, pattern: /^(?:\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/, format: +1 (XXX) XXX-XXXX
- United Kingdom (GB): +44, pattern: /^(?:\+44|0)[0-9]{10}$/, format: +44 XXXX XXX XXXX
- Canada (CA): +1, pattern: /^(?:\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/, format: +1 (XXX) XXX-XXXX
- Australia (AU): +61, pattern: /^(?:\+61|0)[0-9]{9}$/, format: +61 XXX XXX XXX
- Kenya (KE): +254, pattern: /^(?:\+254|0)[0-9]{9}$/, format: +254 XXX XXX XXX
- Ghana (GH): +233, pattern: /^(?:\+233|0)[0-9]{9}$/, format: +233 XXX XXX XXX
- South Africa (ZA): +27, pattern: /^(?:\+27|0)[0-9]{9}$/, format: +27 XXX XXX XXXX
- India (IN): +91, pattern: /^(?:\+91)?[6-9]\d{9}$/, format: +91 XXXXX XXXXX
- Singapore (SG): +65, pattern: /^(?:\+65)?[6-9]\d{7}$/, format: +65 XXXX XXXX

**Tier 2: Basic Validation (70+ countries)**
- All other countries: minimum 7 digits, no regex pattern required
- Format pattern for display varies by country

#### 3.6.2 Phone Input Component Features
- **Country Dropdown:** Shows flag emoji + country name + dial code
  - Example: "🇳🇬 Nigeria (+234)"
  - Sorted: Nigeria first, then alphabetically
  - Searchable/scrollable
- **Phone Input Field:** Free-form typing without auto-formatting interference
- **Validation:**
  - On blur: triggers validation check
  - Error messages show format example
  - Success indicator on valid number
- **Storage:** Country code stored separately from phone number
- **Display Formatting:** Formatted according to country standards
  - Nigerian: +234 803 312 94 44
  - US/Canada: +1 (905) 920-2131
  - UK: +44 2012 3456 78

#### 3.6.3 Phone Formatting Functions

**formatPhoneNumber(phoneNumber, countryCode)**
- Removes all non-digits
- Strips leading 0 for countries that use it
- Applies country-specific format pattern
- Returns formatted string

**formatPhoneNumberForDisplay(phoneNumber, countryCode)**
- Cleans input (removes non-digits)
- Handles leading 0 removal
- Prevents overflow (takes last 10 digits for standard lengths)
- Prepends country code
- Returns fully formatted international number

**validatePhoneNumber(phoneNumber, countryCode)**
- Validates against country-specific regex pattern (if available)
- Checks minimum/maximum length
- Returns validation object: `{ valid: boolean, message: string }`

#### 3.6.4 Default Country
- Nigeria (NG) is set as default throughout the application
- Applies to new student creation
- Can be changed by user in dropdown
- Selected country code is saved with student data

---

## 4. Database Schema (Prisma)

### 4.1 User Model
```
- id (String, PK)
- email (String, unique)
- password (String, hashed)
- firstName (String)
- lastName (String)
- role (UserRole enum)
- isActive (Boolean, default: true)
- createdAt (DateTime)
- updatedAt (DateTime)

Indexes: email
```

### 4.2 Student Model
```
- id (String, PK)
- firstName (String)
- lastName (String)
- email (String, unique, optional)
- phone (String, unique, optional)
- phoneCountryCode (String, optional) // NEW
- dateOfBirth (DateTime, optional)
- isReturningStudent (Boolean, default: false)
- paymentStatus (PaymentStatus enum)
- parentEmail (String, unique, optional)
- parentPhone (String, unique, optional)
- parentPhoneCountryCode (String, optional) // NEW
- createdAt (DateTime)
- updatedAt (DateTime)

Relations:
- enrollments (ProgramEnrollment[])
- courseHistory (CourseHistory[])

Indexes: email, phone, parentEmail, parentPhone, isReturningStudent, dateOfBirth
```

### 4.3 Program Model
```
- id (String, PK)
- name (String)
- type (ProgramType enum: WEEKEND_CLUB, HOLIDAY_CAMP)
- season (Season enum: JANUARY, EASTER, MAY, SUMMER, OCTOBER)
- year (Int)
- batches (Int)
- slots (String[])
- startDate (DateTime)
- createdAt (DateTime)
- updatedAt (DateTime)

Relations:
- classes (Class[])
- enrollments (ProgramEnrollment[])

Indexes: season, year
Unique: (name, season, year)
```

### 4.4 Class Model
```
- id (String, PK)
- name (String, unique)
- courseId (String, FK)
- programId (String, FK)
- programLevel (ProgramLevel enum)
- batch (Int)
- slot (String)
- schedule (String)
- capacity (Int)
- students (String[])
- teacherId (String, FK, optional)
- meetLink (String, optional)
- isArchived (Boolean, default: false)
- createdAt (DateTime)
- updatedAt (DateTime)

Relations:
- course (Course)
- program (Program)
- teacher (Teacher, optional)
- enrollments (ProgramEnrollment[])

Indexes: programId, courseId, teacherId, isArchived
Unique: name
```

### 4.5 Teacher Model
```
- id (String, PK)
- firstName (String)
- lastName (String)
- email (String, unique)
- phone (String)
- bio (String, optional)
- profilePhoto (String, optional)
- status (TeacherStatus enum: ACTIVE, INACTIVE, ON_LEAVE)
- qualifiedCourses (String[])
- createdAt (DateTime)
- updatedAt (DateTime)

Relations:
- classes (Class[])

Indexes: email, status
```

### 4.6 Course Model
```
- id (String, PK)
- name (String, unique)
- description (String, optional)
- programLevels (ProgramLevel[])
- createdAt (DateTime)
- updatedAt (DateTime)

Relations:
- classes (Class[])

Indexes: name
```

### 4.7 ProgramEnrollment Model
```
- id (String, PK)
- studentId (String, FK)
- programId (String, FK)
- classId (String, FK, optional)
- batchNumber (Int, default: 1)
- enrollmentDate (DateTime)
- status (EnrollmentStatus enum)
- paymentStatus (PaymentStatus enum)
- priceType (PriceType enum)
- priceAmount (Int)
- createdAt (DateTime)
- updatedAt (DateTime)

Relations:
- student (Student)
- program (Program)
- class (Class, optional)

Indexes: studentId, programId, classId, status
```

### 4.8 CourseHistory Model
```
- id (String, PK)
- studentId (String, FK)
- courseId (String)
- courseName (String)
- programId (String, optional)
- programName (String, optional)
- batch (Int, default: 1)
- year (Int, optional)
- completionStatus (CompletionStatus enum)
- startDate (DateTime, optional)
- endDate (DateTime, optional)
- performanceNotes (String, optional)
- dateAdded (DateTime)
- createdAt (DateTime)
- updatedAt (DateTime)

Relations:
- student (Student)

Indexes: studentId, completionStatus, dateAdded
```

### 4.9 PricingConfig Model
```
- id (String, PK)
- priceType (PriceType enum, unique)
- amount (Int)
- updatedBy (String, optional)
- createdAt (DateTime)
- updatedAt (DateTime)

Indexes: priceType
```

### 4.10 Enums

**UserRole**
- SUPERADMIN
- ADMIN
- STAFF

**ProgramType**
- WEEKEND_CLUB
- HOLIDAY_CAMP

**Season**
- JANUARY
- EASTER
- MAY
- SUMMER
- OCTOBER

**ProgramLevel**
- CREATORS
- INNOVATORS
- INVENTORS

**TeacherStatus**
- ACTIVE
- INACTIVE
- ON_LEAVE

**EnrollmentStatus**
- WAITLIST
- ASSIGNED
- COMPLETED
- DROPPED

**PaymentStatus**
- PENDING
- CONFIRMED
- COMPLETED

**PriceType**
- FULL_PRICE
- SIBLING_DISCOUNT
- EARLY_BIRD

**CompletionStatus**
- IN_PROGRESS
- COMPLETED

---

## 5. API Endpoints

### 5.1 Student Endpoints

#### GET /api/students
- **Purpose:** Fetch all students
- **Authentication:** Required
- **Permissions:** READ_STUDENTS
- **Response:** Array of Student objects with enrollments and course history
- **Includes:** Enrollments (with class and program details), course history

#### GET /api/students/[id]
- **Purpose:** Fetch a specific student
- **Authentication:** Required
- **Permissions:** READ_STUDENTS
- **Response:** Single Student object
- **Includes:** Enrollments (with class and program), course history

#### POST /api/students
- **Purpose:** Create a new student
- **Authentication:** Required
- **Permissions:** CREATE_STUDENT
- **Request Body:**
  ```
  {
    firstName: string (required)
    lastName: string (required)
    email: string (optional)
    phone: string (optional)
    phoneCountryCode: string (optional)
    dateOfBirth: string (optional, ISO date)
    isReturningStudent: boolean
    parentEmail: string (optional)
    parentPhone: string (optional)
    parentPhoneCountryCode: string (optional)
    courseHistory: CourseHistory[] (optional)
    programEnrollments: ProgramEnrollment[] (optional)
  }
  ```
- **Response:** Created Student object
- **Validations:** Unique email, phone, parentEmail, parentPhone

#### PUT /api/students/[id]
- **Purpose:** Update a student
- **Authentication:** Required
- **Permissions:** UPDATE_STUDENT
- **Request Body:** Partial Student object (all fields optional except id)
- **Response:** Updated Student object
- **Side Effects:**
  - Handles program enrollment updates/creates/deletes
  - Handles course history updates/creates/deletes
  - Refreshes student data after update

#### DELETE /api/students/[id]
- **Purpose:** Delete a student
- **Authentication:** Required
- **Permissions:** DELETE_STUDENT
- **Response:** `{ success: true }`

### 5.2 Program Endpoints

#### GET /api/programs
- **Purpose:** Fetch all programs
- **Authentication:** Required
- **Permissions:** READ_PROGRAMS (implicit)
- **Response:** Array of Program objects

#### POST /api/programs
- **Purpose:** Create a new program
- **Authentication:** Required
- **Permissions:** Admin+
- **Request Body:** Program data

#### PUT /api/programs/[id]
- **Purpose:** Update a program
- **Authentication:** Required
- **Permissions:** Admin+

#### DELETE /api/programs/[id]
- **Purpose:** Delete a program
- **Authentication:** Required
- **Permissions:** Admin+

### 5.3 Class Endpoints

#### GET /api/classes
- **Purpose:** Fetch all classes
- **Authentication:** Required
- **Response:** Array of Class objects with related program and course

#### POST /api/classes
- **Purpose:** Create a new class
- **Authentication:** Required
- **Permissions:** Admin+

#### PUT /api/classes/[id]
- **Purpose:** Update a class
- **Authentication:** Required
- **Permissions:** Admin+

#### DELETE /api/classes/[id]
- **Purpose:** Delete a class
- **Authentication:** Required
- **Permissions:** Admin+

### 5.4 Enrollment Endpoints

#### GET /api/enrollments
- **Purpose:** Fetch all enrollments
- **Authentication:** Required
- **Permissions:** READ_STUDENTS

#### POST /api/enrollments
- **Purpose:** Create program enrollment
- **Authentication:** Required
- **Permissions:** CREATE_STUDENT
- **Request Body:**
  ```
  {
    studentId: string
    programId: string
    batchNumber: int
    classId: string (optional)
    status: EnrollmentStatus
    paymentStatus: PaymentStatus
    priceType: PriceType
    priceAmount: int
  }
  ```

#### PUT /api/enrollments/[id]
- **Purpose:** Update enrollment
- **Authentication:** Required
- **Permissions:** UPDATE_STUDENT

#### DELETE /api/enrollments/[id]
- **Purpose:** Delete enrollment
- **Authentication:** Required
- **Permissions:** UPDATE_STUDENT

### 5.5 Pricing Endpoints

#### GET /api/pricing
- **Purpose:** Fetch all pricing configurations
- **Authentication:** Required
- **Response:** Array of PricingConfig objects

#### PUT /api/pricing/[priceType]
- **Purpose:** Update pricing for a type
- **Authentication:** Required
- **Permissions:** SUPERADMIN
- **Request Body:**
  ```
  {
    amount: int (required)
  }
  ```

### 5.6 Course History Endpoints

#### POST /api/course-history
- **Purpose:** Create course history entry
- **Authentication:** Required
- **Permissions:** CREATE_STUDENT

#### PUT /api/course-history/[id]
- **Purpose:** Update course history
- **Authentication:** Required
- **Permissions:** UPDATE_STUDENT

#### DELETE /api/course-history/[id]
- **Purpose:** Delete course history
- **Authentication:** Required
- **Permissions:** UPDATE_STUDENT

---

## 6. User Interface

### 6.1 Navigation Structure

**Main Navigation Tabs:**
1. **Dashboard** - Analytics and overview (visible to Admin+)
2. **Students** - Student management (visible to Admin+)
3. **Programs** - Program management (visible to Admin+)
4. **Classes** - Class management (visible to Admin+)
5. **Pricing** - Pricing configuration (visible to Superadmin only)

**Header:**
- 9jacodekids Academy branding
- User welcome message
- Role indicator
- Logout button

**Footer:**
- Copyright notice: © 2024 9jacodekids Academy

### 6.2 Key UI Components

#### Student Management
- **Student List View:**
  - Search by name/email
  - Student cards with ID, name, status
  - Action buttons: View Details, Edit, Delete
  - Pagination/scroll
  - Add Student button

- **Student Details Modal:**
  - Student header with name, ID, type (NEW badge if applicable)
  - Quick info grid: Email, Phone, Student Type
  - Birth date and age
  - Parent/Guardian Contact section with formatted phone numbers
  - Action buttons:
    - "Enroll to Program" - start enrollment process
    - "Assign to Class" - assign to classes
    - "Edit Profile" - edit student details
    - "Close" - close modal

- **Student Form Modal:**
  - Size: Large (max-w-2xl / 672px width)
  - Personal Information Section:
    - First Name (required)
    - Last Name (required)
    - Email (optional)
    - Date of Birth (optional)
  - Student Phone Section (Optional):
    - Country dropdown with flags (🇳🇬 Nigeria (+234), etc.)
    - Phone input field (validates on blur)
    - Format example and error messages
  - Student Enrollment (optional):
    - Program selection dropdown
    - Multiple batch selection with pricing tier per batch
  - Past Courses Section:
    - List of completed courses (optional)
    - Checkboxes to select courses
  - Parent/Guardian Contact Section (Optional):
    - Email field
    - Phone field with country dropdown
    - Format validation
  - Submit and Cancel buttons

- **Phone Input Component:**
  - Dropdown: Country selection with flag + name + code
  - Input: Free-form typing (no auto-formatting)
  - Validation: On blur, shows error or success
  - Examples: Shows format example
  - Error messages: Format-specific guidance
  - Success indicator: Green checkmark when valid

#### Dashboard
- Grid/card layout with responsive design
- Multiple chart components (bar, pie, line charts)
- Summary statistics cards
- Real-time data
- Trend analysis sections

#### Pricing Management
- Form-based interface
- Input fields for each price type
- Current price display
- Save/Update buttons
- Success/error notifications

### 6.3 Modal Specifications

**Form Modal:**
- Size: `max-w-2xl` (672px)
- Backdrop: Semi-transparent black
- Close button: Top right corner
- Scroll: Content area scrollable if needed
- Animation: Fade in/scale up

**Details Modal:**
- Size: Auto (content-sized)
- Same styling as form modal
- Contains action buttons
- Scrollable content area

### 6.4 Color Scheme

**Primary Colors:**
- Purple gradient: from-purple-600 to blue-600 (buttons, accents)
- Note: Brand colors were available but reverted due to UX concerns
  - Red: #db3236
  - Yellow: #f4c20d
  - Blue: #4885ed

**Secondary Colors:**
- Gray: Text, borders, backgrounds
- Red: Errors, alerts
- Green: Success, validation
- Blue: Accents, focus states

**Backgrounds:**
- White: Main content
- Gray-50: Sections, cards
- Purple-50/Blue-50: Headers, highlights

---

## 7. Technical Architecture

### 7.1 Technology Stack

**Frontend:**
- Next.js 14.2.33 (React framework)
- TypeScript
- Tailwind CSS (styling)
- Framer Motion (animations)
- SWR (data fetching and caching)
- React Hooks (state management)

**Backend:**
- Next.js API Routes
- Node.js runtime

**Database:**
- PostgreSQL
- Prisma ORM (v6.19.0)

**Authentication:**
- Session-based authentication
- Bcrypt for password hashing
- JWT support ready

**Deployment:**
- Docker containerization
- Nixpacks for build configuration
- CI/CD ready

### 7.2 Project Structure

```
/
├── app/
│   ├── api/
│   │   ├── students/
│   │   │   ├── route.ts (GET, POST)
│   │   │   └── [id]/route.ts (GET, PUT, DELETE)
│   │   ├── programs/
│   │   ├── classes/
│   │   ├── enrollments/
│   │   ├── course-history/
│   │   ├── pricing/
│   │   └── auth/
│   ├── page.tsx (Main application)
│   └── layout.tsx
├── components/
│   ├── ui/
│   │   ├── PhoneInput.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   └── index.ts (exports)
│   ├── StudentManagement/
│   │   ├── index.tsx (Main component)
│   │   ├── StudentForm.tsx
│   │   ├── StudentList.tsx
│   │   ├── StudentDetailsView.tsx
│   │   ├── CourseHistorySection.tsx
│   │   ├── ProgramEnrollmentsSection.tsx
│   │   ├── PaymentStatusSection.tsx
│   │   └── AssignmentModal.tsx
│   ├── Dashboard/
│   │   ├── index.tsx
│   │   ├── ProgramDistribution.tsx
│   │   ├── RevenueForecast.tsx
│   │   ├── RevenueAnalytics.tsx
│   │   ├── DiscountAnalysis.tsx
│   │   ├── YearOverYearComparison.tsx
│   │   ├── ProgramComparison.tsx
│   │   ├── ProgramHistoryComparison.tsx
│   │   └── QuickStats.tsx
│   └── PricingManagement/
│       └── index.tsx
├── lib/
│   ├── constants/
│   │   ├── countries.ts (Phone validation and formatting)
│   │   ├── pricing.ts
│   │   └── permissions.ts
│   ├── hooks/
│   │   ├── useStudents.ts
│   │   ├── usePrograms.ts
│   │   ├── useClasses.ts
│   │   ├── useCourses.ts
│   │   ├── usePricing.ts
│   │   ├── useAuth.ts
│   │   └── index.ts
│   ├── auth.ts (Session handling)
│   ├── prisma.ts (Database client)
│   ├── permissions.ts (RBAC)
│   └── fetch-with-auth.ts (Authenticated requests)
├── prisma/
│   ├── schema.prisma (Database schema)
│   └── migrations/ (Database migrations)
├── types/
│   └── index.ts (TypeScript interfaces)
├── public/
│   └── (static assets)
├── styles/
│   └── globals.css
├── .env.local (Environment variables)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

### 7.3 Data Flow

**Create Student Flow:**
1. User fills StudentForm with data
2. Form validation on submission
3. POST /api/students with student data
4. API validates uniqueness (email, phone, parentEmail, parentPhone)
5. Prisma creates Student record
6. Enrollments created separately (POST /api/enrollments)
7. Course history created separately (POST /api/course-history)
8. SWR cache invalidated
9. StudentManagement fetches fresh data
10. UI updates with new student

**Edit Student Flow:**
1. User clicks "Edit Profile" on Student Details
2. StudentForm loads with initialData from student
3. Country codes load from phoneCountryCode and parentPhoneCountryCode
4. Form shows pre-filled data
5. User makes changes
6. PUT /api/students/[id] with updated data
7. API updates Student record
8. Side effects: enrollment and course history updates/deletes
9. viewingStudent refreshed from hook data
10. StudentDetailsView updates with new data

**Phone Validation Flow:**
1. User selects country from dropdown
2. Sets phoneCountryCode state
3. User types phone number
4. Free-form input (no auto-formatting)
5. On blur, validatePhoneNumber() called
6. Validation checks regex pattern and length
7. Error or success message displayed
8. On form submit, phone saved with country code
9. On display, formatPhoneNumberForDisplay() formats for view

---

## 8. Permissions & Access Control

### 8.1 Role-Based Permissions

**SUPERADMIN:**
- CREATE_STUDENT, READ_STUDENTS, UPDATE_STUDENT, DELETE_STUDENT
- CREATE_PROGRAM, READ_PROGRAMS, UPDATE_PROGRAM, DELETE_PROGRAM
- CREATE_CLASS, READ_CLASSES, UPDATE_CLASS, DELETE_CLASS
- READ_PRICING, UPDATE_PRICING
- Full dashboard access

**ADMIN:**
- CREATE_STUDENT, READ_STUDENTS, UPDATE_STUDENT, DELETE_STUDENT
- READ_PROGRAMS, READ_CLASSES
- READ_PRICING (no update)
- Full dashboard access

**STAFF:**
- READ_STUDENTS, READ_PROGRAMS, READ_CLASSES
- Limited dashboard access
- No create/update/delete permissions

### 8.2 Feature Visibility

| Feature | Superadmin | Admin | Staff |
|---------|-----------|-------|-------|
| Dashboard | ✓ | ✓ | ✓* |
| Students Tab | ✓ | ✓ | ✗ |
| Create Student | ✓ | ✓ | ✗ |
| Edit Student | ✓ | ✓ | ✗ |
| Delete Student | ✓ | ✓ | ✗ |
| Pricing Tab | ✓ | ✗ | ✗ |
| Manage Pricing | ✓ | ✗ | ✗ |

*Limited metrics and read-only access

---

## 9. Validation & Error Handling

### 9.1 Form Validations

**Student Form:**
- First name: Required, non-empty
- Last name: Required, non-empty
- Email: Valid email format if provided, must be unique
- Phone: Country-specific validation if provided, must be unique
- Phone Country Code: Must be valid country code
- Parent Email: Valid email format if provided, must be unique
- Parent Phone: Country-specific validation if provided, must be unique
- Parent Phone Country Code: Valid country code
- Cross-validation: Student/parent emails different, Student/parent phones different

**Phone Validation by Country:**
- Validates against country-specific regex (if available)
- Checks minimum length (7+ digits for basic validation)
- Checks maximum length (varies by country)
- Shows format example on error

### 9.2 API Validations

**Uniqueness Checks:**
- Email across all students
- Phone across all students
- Parent email across all parents
- Parent phone across all parents
- Program name (with season, year)
- Class name
- Course name

**Required Fields:**
- Student: firstName, lastName
- Program: name, type, season, year
- Class: name, courseId, programId
- Course: name

### 9.3 Error Messages

**User-Friendly Responses:**
- Validation errors return detailed error object with `details` array
- API errors include descriptive messages
- Form shows field-level error messages
- Notification/alert system for user feedback

---

## 10. Deployment & DevOps

### 10.1 Deployment Process

**Build Requirements:**
- Node.js 22
- npm 10+
- PostgreSQL database

**Build Steps:**
1. Install dependencies: `npm ci`
2. Generate Prisma client: `npx prisma generate`
3. Sync database schema: `npx prisma db push` (or `migrate deploy`)
4. Build Next.js: `npm run build`
5. Run application: `npm start`

**Docker Deployment:**
- Uses Nixpacks for build configuration
- Environment variables via `.env`
- Volume mounting for persistent data (if needed)

### 10.2 Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/academy_enrollment
NEXT_PUBLIC_API_URL=http://localhost:3000

Optional:
COOLIFY_URL=https://cms.9jacodekids.com
COOLIFY_FQDN=cms.9jacodekids.com
```

### 10.3 Database Migrations

**Migration Process:**
1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name description`
3. Migration applies to development database
4. Commit `prisma/migrations/` directory
5. On deployment: `npx prisma migrate deploy`

**Current Migrations:**
- Add phone country code fields (bd2ec3c)
- Previous: Student schema, enrollments, pricing, etc.

---

## 11. Performance & Scalability

### 11.1 Optimization Strategies

**Database:**
- Indexed fields for fast queries (email, phone, status, dates)
- Efficient relationships with Prisma includes
- Pagination for large lists

**Frontend:**
- SWR with cache and revalidation
- Component-based architecture
- Lazy loading where applicable
- Optimized re-renders with React hooks

**API:**
- Debounced requests
- Cache invalidation on mutations
- Batch operations for enrollments

### 11.2 Caching Strategy

**SWR Configuration:**
- `revalidateOnFocus: true` - Refresh on window focus
- `revalidateOnReconnect: true` - Refresh on internet reconnect
- `focusThrottleInterval: 0` - No throttling on focus

**Data Refresh:**
- After student creation/update: `mutate()` to refetch
- Automatic UI updates via hook state
- Details view refreshes after edit completion

---

## 12. Future Enhancements

### 12.1 Planned Features
- SMS notifications for enrollment status
- Email notifications
- Bulk student import (CSV)
- Advanced reporting and export
- Student portal (view own details, contact info)
- Payment integration (online payments)
- Attendance tracking
- Grade/performance tracking
- Certificate generation

### 12.2 Potential Improvements
- Dark mode toggle
- Mobile app (React Native)
- Two-factor authentication
- Audit logging
- API rate limiting
- Advanced analytics with custom reports
- Multi-language support
- Teacher portal
- Parent portal

---

## 13. Security Considerations

### 13.1 Implemented Security

**Authentication:**
- Session-based authentication with secure cookies
- Password hashing with bcrypt
- Protected API routes

**Authorization:**
- Role-based access control on all endpoints
- Permission checks before operations
- Frontend conditional rendering based on roles

**Data Protection:**
- Input validation on all forms
- SQL injection prevention via Prisma ORM
- XSS prevention via React escaping
- CORS configuration

### 13.2 Security Best Practices

- Environment variables for sensitive data
- No sensitive data in client-side code
- Secure password storage
- Rate limiting ready
- Audit trails ready (timestamp tracking)

---

## 14. Testing Strategy

### 14.1 Recommended Testing

**Unit Tests:**
- Validation functions (phone, email, etc.)
- Formatting functions
- Permission checks

**Integration Tests:**
- API endpoints (CRUD operations)
- Student creation with enrollments
- Phone validation across countries

**E2E Tests:**
- User workflows (create student → enroll → assign)
- Form submissions
- Error handling

### 14.2 Test Coverage Areas
- Student CRUD operations
- Program and class management
- Enrollment workflows
- Phone number validation for all supported countries
- Pricing configuration
- Role-based access control
- Error handling and validation

---

## 15. Documentation

### 15.1 Available Documentation
- This PRD
- Inline code comments
- TypeScript interfaces in `types/index.ts`
- API endpoint implementations
- Constants in `lib/constants/`

### 15.2 Additional Documentation Needed
- API documentation (Swagger/OpenAPI)
- User guide for administrators
- Troubleshooting guide
- Developer setup guide
- Database schema diagrams

---

## 16. Project Dependencies

### 16.1 Core Dependencies
```json
{
  "next": "^14.2.33",
  "react": "^18",
  "react-dom": "^18",
  "typescript": "^5",
  "@prisma/client": "^6.19.0",
  "tailwindcss": "^3",
  "swr": "^2",
  "framer-motion": "^10"
}
```

### 16.2 Development Dependencies
```json
{
  "prisma": "^6.19.0",
  "@types/node": "^20",
  "@types/react": "^18",
  "@types/react-dom": "^18"
}
```

---

## 17. Support & Maintenance

### 17.1 Known Issues
- None currently documented

### 17.2 Maintenance Tasks
- Regular database backups
- Security updates for dependencies
- Performance monitoring
- Log analysis and error tracking
- User feedback integration

### 17.3 Support Channels
- Direct code review and updates
- Database optimization as needed
- Performance tuning
- Feature additions based on needs

---

## Appendix A: Country Phone Codes Reference

### Full Country List (80+)

**Available Countries:** Nigeria, United States, United Kingdom, Canada, Australia, Kenya, Ghana, South Africa, India, Singapore, and 70+ more countries with standard 10+ digit support.

**Format Examples:**
- Nigeria: `+234 803 312 94 44`
- USA: `+1 (905) 920-2131`
- Canada: `+1 (905) 920-2131`
- UK: `+44 2012 3456 78`

---

## Appendix B: Glossary

- **Enrollment:** A student's registration in a program
- **Batch:** A sub-group within a program (e.g., Batch 1, Batch 2)
- **Class:** A specific section of a course within a program
- **Course History:** Record of all courses a student has taken
- **Payment Status:** Current payment state (PENDING, CONFIRMED, COMPLETED)
- **Enrollment Status:** Current state of program enrollment
- **Country Code:** ISO 3166-1 alpha-2 code (e.g., NG, US, GB)
- **Dial Code:** International phone prefix (e.g., +234, +1, +44)

---

## Appendix C: File Manifest

### Core Application Files
- `app/page.tsx` - Main application layout and navigation
- `app/layout.tsx` - Root layout

### Components
- `components/StudentManagement/index.tsx` - Student management wrapper
- `components/StudentManagement/StudentForm.tsx` - Student creation/edit form
- `components/StudentManagement/StudentList.tsx` - Student list display
- `components/StudentManagement/StudentDetailsView.tsx` - Student detail modal
- `components/ui/PhoneInput.tsx` - Phone number input with country selection
- `components/Dashboard/index.tsx` - Dashboard main component

### API Routes
- `app/api/students/route.ts` - Student GET/POST
- `app/api/students/[id]/route.ts` - Student GET/PUT/DELETE
- `app/api/programs/*` - Program endpoints
- `app/api/classes/*` - Class endpoints
- `app/api/enrollments/*` - Enrollment endpoints
- `app/api/course-history/*` - Course history endpoints
- `app/api/pricing/*` - Pricing endpoints

### Utilities & Constants
- `lib/constants/countries.ts` - Phone validation, formatting, country data
- `lib/constants/pricing.ts` - Pricing utilities
- `lib/hooks/useStudents.ts` - Student data management hook
- `lib/auth.ts` - Authentication utilities
- `lib/permissions.ts` - Permission definitions

### Database
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/*` - Database migrations

### Configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `next.config.js` - Next.js configuration
- `package.json` - Dependencies and scripts

---

**End of PRD**

Document Version: 1.0
Last Updated: March 21, 2026
Status: Ready for Development/Enhancement
