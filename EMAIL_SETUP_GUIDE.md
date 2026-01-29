# Email Notification System Setup Guide

## Overview

The Academy Enrollment system now includes an email notification feature that sends class assignment emails to:
- **Teachers** when assigned to a class
- **Students** when assigned to a class (if email available)
- **Parents** when their child is assigned to a class (if email available)

## Architecture

### Components

1. **Email Service** (`lib/email.ts`)
   - Handles AWS SES integration
   - Generates HTML email templates
   - Manages email recipients

2. **API Endpoint** (`app/api/emails/send-enrollment/route.ts`)
   - Accepts enrollment requests
   - Fetches student, class, course, and program data
   - Sends emails to all relevant recipients

3. **Integration Point** (`components/StudentManagement/StudentDetailsView.tsx`)
   - Calls email API after successful class assignment
   - Non-blocking - doesn't wait for email response

4. **Database** (`prisma/schema.prisma`)
   - New `meetLink` field on Class model stores Google Meet link
   - Optional field - emails work with or without Meet link

## Setup Instructions

### Step 1: Configure AWS SES Credentials

You need an AWS account with SES (Simple Email Service) access. Follow these steps:

1. **Log in to AWS Console**
   - Go to https://console.aws.amazon.com/

2. **Create IAM User for SES** (or use existing)
   - Navigate to IAM → Users
   - Create a new user or select existing one
   - Create access key (Access Key ID + Secret Access Key)

3. **Add SES Policy to IAM User**
   - In IAM, go to Policies
   - Create a policy with the following permissions:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "ses:SendEmail",
           "Resource": "*"
         },
         {
           "Effect": "Allow",
           "Action": "ses:SendRawEmail",
           "Resource": "*"
         }
       ]
     }
     ```
   - Attach this policy to your IAM user

4. **Verify Email Address in SES**
   - Go to SES Console → Email Addresses
   - Click "Verify a New Email Address"
   - Verify `noreply@9jacodekids.com` (or your preferred sender email)
   - Check your email and click the verification link

5. **Request Production Access** (if in sandbox mode)
   - In SES Console, check Account Dashboard
   - If in "sandbox mode," request production access
   - AWS will review and approve (usually within 24 hours)

### Step 2: Add Environment Variables

Update your `.env` file with AWS SES credentials:

```bash
# AWS SES Configuration
AWS_ACCESS_KEY_ID="your-iam-access-key-id"
AWS_SECRET_ACCESS_KEY="your-iam-secret-access-key"
AWS_REGION="us-east-1"

# Email Configuration
AWS_SES_FROM_EMAIL="noreply@9jacodekids.com"
```

**Important**: Replace with your actual credentials and verified email address.

### Step 3: Verify Setup

1. **Test Email Sending**
   ```bash
   # Assign a student to a class in the application
   # Check server logs for:
   # [Email] Class assignment email sent to [email] (teacher/student/parent)
   ```

2. **Check AWS SES Metrics**
   - Go to SES Console → Dashboard
   - Verify "Emails Sent" count increases

## How It Works

### When a Student is Assigned to a Class

1. User clicks "Assign to Class" in StudentDetailsView
2. `handleAssignStudent()` function runs:
   - Updates student enrollment status to ASSIGNED
   - Adds student to class roster
   - Creates IN_PROGRESS course history entry
   - Calls `/api/emails/send-enrollment` endpoint

3. Email API (`/api/emails/send-enrollment`) executes:
   - Fetches student details (email, parent email, name)
   - Fetches class details (name, course, program, teacher)
   - Prepares email recipients (teacher, student, parent)
   - Sends HTML formatted emails via AWS SES
   - Logs email sending status

4. Email Content Includes:
   - Program name and batch number
   - Class name
   - Course name
   - Time slot and schedule
   - Instructor name (if available)
   - Google Meet link (if configured)
   - Enrollment date
   - Academy branding

### Email Recipients

**Teacher** (if assigned to class)
- Receives: Class details, student info, Meet link
- Purpose: Notification of class assignment

**Student** (if email available in database)
- Receives: Class details, instructor info, Meet link
- Purpose: Course enrollment confirmation

**Parent** (if parent email available in database)
- Receives: Class details, student enrolled info, Meet link
- Purpose: Parent notification of student enrollment

## Google Meet Integration

### Adding Meet Links to Classes

The system supports Google Meet links via a new `meetLink` field on the Class model.

**Implementation Steps (For Future):**

1. **Set Up Google Cloud Project**
   - Follow instructions in the Google Meet API documentation
   - Get API credentials (service account JSON key)

2. **Add Environment Variables**
   ```bash
   GOOGLE_MEET_API_KEY="your-api-key"
   GOOGLE_MEET_PROJECT_ID="your-project-id"
   ```

3. **Create Google Meet Service**
   - Similar structure to email service
   - Generate Meet links when classes are created
   - Store links in `Class.meetLink` field

4. **Links Automatically Included in Emails**
   - No additional changes needed
   - Email service will include any stored Meet link

## Troubleshooting

### Emails Not Sending

**Issue**: No emails received, but no error in logs

**Solutions**:
1. Verify AWS credentials in `.env`
2. Check SES is not in sandbox mode
3. Verify email address is confirmed in SES
4. Check AWS CloudWatch logs for SES errors

### Email in Spam/Junk

**Solutions**:
1. Add SPF, DKIM, and DMARC records to your domain
2. Use domain-verified email instead of no-reply address
3. Include unsubscribe link in emails (future enhancement)

### Students Not Receiving Emails

**Issue**: Student emails not in database or invalid

**Solutions**:
1. Check student record has valid email address
2. Verify email address format is correct
3. API returns `emailsSent` count - check if 0

### Parent Emails Not Sent

**Issue**: Parent emails not configured

**Solutions**:
1. Add parent email to student record
2. Ensure parent email is valid format
3. Check API response for parent email count

## Testing

### Manual Testing

1. Log in as admin
2. Go to Students → Select Student → Assign to Class
3. Check:
   - Success message appears
   - AWS SES metrics increase
   - Server logs show email sent messages
4. Check email inboxes (teacher, student, parent)

### Viewing Logs

```bash
# Server logs show email activity
# Look for: [Email] Class assignment email sent to [email]

# Check what was sent:
# [Email] Enrollment emails sent: { teachers: 1, students: 1, parents: 0 }
```

## Future Enhancements

1. **Email Templates**
   - Add ability to customize email templates
   - Support for multiple languages

2. **Email Logging**
   - Store sent emails in database for audit trail
   - Track delivery and bounce status

3. **Certificates**
   - Send course completion certificates via email
   - Include digital badges

4. **Bulk Operations**
   - Send emails when bulk importing students
   - Batch email sending for efficiency

5. **Email Preferences**
   - Let parents/students manage email preferences
   - Unsubscribe functionality
   - Digest email options

## API Reference

### POST `/api/emails/send-enrollment`

**Request Body**:
```json
{
  "studentId": "student-cuid",
  "classId": "class-cuid"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "emailsSent": {
    "teachers": 1,
    "students": 1,
    "parents": 0
  }
}
```

**Response (Error)**:
```json
{
  "error": "Failed to send emails"
}
```

## Security Considerations

1. **API Authentication**
   - All email endpoints require user authentication
   - Only authenticated users can trigger emails

2. **Credential Management**
   - Never commit `.env` file to git
   - Use environment variables in production
   - Rotate AWS credentials regularly

3. **Email Content**
   - No sensitive student passwords in emails
   - Safe HTML templates prevent injection attacks
   - Personal data only sent to authorized recipients

## Support

For issues or questions:
1. Check server logs for error messages
2. Verify AWS SES credentials and configuration
3. Ensure email addresses are valid and verified in SES
4. Check email spam/junk folders
