# API Routes Guide

All API routes follow RESTful conventions. Database models are handled by Prisma.

## Students API

### `GET /api/students`
Fetch all students with their enrollments and course history.

**Response:**
```json
[
  {
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "dateOfBirth": "datetime",
    "isReturningStudent": boolean,
    "paymentStatus": "PENDING|CONFIRMED|COMPLETED",
    "parentEmail": "string",
    "parentPhone": "string",
    "enrollments": [...],
    "courseHistory": [...]
  }
]
```

### `POST /api/students`
Create a new student.

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "isReturningStudent": boolean,
  "parentEmail": "string",
  "parentPhone": "string"
}
```

### `GET /api/students/[id]`
Fetch a specific student with all relations.

### `PUT /api/students/[id]`
Update student information.

### `DELETE /api/students/[id]`
Delete a student (cascades to enrollments and course history).

---

## Programs API

### `GET /api/programs`
Fetch all programs.

**Response Fields:**
- `id`, `name`, `type` (WEEKEND_CLUB|HOLIDAY_CAMP)
- `season` (JANUARY|EASTER|MAY|SUMMER|OCTOBER)
- `year`, `batches`, `slots`, `createdAt`, `updatedAt`

### `POST /api/programs`
Create a new program.

### `GET /api/programs/[id]`
Fetch a specific program.

### `PUT /api/programs/[id]`
Update program.

### `DELETE /api/programs/[id]`
Delete program.

---

## Classes API

### `GET /api/classes`
Fetch all classes.

**Response Fields:**
- `id`, `name`, `courseId`, `programId`
- `programLevel` (CREATORS|INNOVATORS|INVENTORS)
- `batch`, `slot`, `schedule`
- `capacity`, `students` (array of student IDs)
- `teacherId`, `isArchived`

### `POST /api/classes`
Create a new class.

### `GET /api/classes/[id]`
Fetch a specific class.

### `PUT /api/classes/[id]`
Update class (including archiving with `isArchived` field).

### `DELETE /api/classes/[id]`
Delete class.

---

## Courses API

### `GET /api/courses`
Fetch all courses.

**Response Fields:**
- `id`, `name`, `description`
- `programLevels` (array: CREATORS, INNOVATORS, INVENTORS)

### `POST /api/courses`
Create a new course.

### `GET /api/courses/[id]`
Fetch a specific course.

### `PUT /api/courses/[id]`
Update course.

### `DELETE /api/courses/[id]`
Delete course.

---

## Teachers API

### `GET /api/teachers`
Fetch all teachers.

**Response Fields:**
- `id`, `firstName`, `lastName`, `email`, `phone`
- `bio`, `profilePhoto`
- `status` (ACTIVE|INACTIVE|ON_LEAVE)
- `qualifiedCourses` (array of course IDs)

### `POST /api/teachers`
Create a new teacher.

### `GET /api/teachers/[id]`
Fetch a specific teacher.

### `PUT /api/teachers/[id]`
Update teacher.

### `DELETE /api/teachers/[id]`
Delete teacher.

---

## Program Enrollments API

### `GET /api/enrollments`
Fetch all program enrollments.

**Response Fields:**
- `id`, `studentId`, `programId`, `classId` (nullable for waitlist)
- `batchNumber`, `enrollmentDate`
- `status` (WAITLIST|ASSIGNED|COMPLETED|DROPPED)
- `paymentStatus` (PENDING|CONFIRMED|COMPLETED)

### `POST /api/enrollments`
Create a new program enrollment.

**Request Body:**
```json
{
  "studentId": "string",
  "programId": "string",
  "classId": "string|null",
  "batchNumber": 1,
  "status": "WAITLIST|ASSIGNED",
  "paymentStatus": "PENDING"
}
```

### `GET /api/enrollments/[id]`
Fetch a specific enrollment.

### `PUT /api/enrollments/[id]`
Update enrollment (used for promoting waitlist to assigned).

### `DELETE /api/enrollments/[id]`
Delete enrollment.

---

## Course History API

### `GET /api/course-history`
Fetch all course history entries.

**Response Fields:**
- `id`, `studentId`, `courseId`, `courseName`
- `programId`, `programName`
- `batch`, `year`
- `completionStatus` (IN_PROGRESS|COMPLETED|DROPPED)
- `startDate`, `endDate`, `performanceNotes`

### `POST /api/course-history`
Create a new course history entry.

### `GET /api/course-history/[id]`
Fetch a specific entry.

### `PUT /api/course-history/[id]`
Update course history (mark as completed).

### `DELETE /api/course-history/[id]`
Delete course history entry.

---

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success (GET, PUT)
- `201` - Created (POST)
- `400` - Bad Request
- `404` - Not Found
- `500` - Server Error

**Error Response Format:**
```json
{
  "error": "Error message"
}
```

---

## Next Steps

1. Implement remaining API routes following this pattern
2. Update hooks in `lib/hooks/` to call API endpoints instead of localStorage
3. Test each endpoint with Postman or curl
4. Deploy to Coolify with PostgreSQL database
