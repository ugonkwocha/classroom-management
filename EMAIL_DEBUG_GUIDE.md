# 🔍 Email System - Debugging Guide

**Last Updated**: 2026-01-29
**Issue**: Emails not arriving after student assignment
**Status**: Diagnostics implemented with detailed logging

---

## Problem Statement

After assigning a student to a class, no emails are being received in the parent/student/teacher inboxes, even after 10+ minutes.

---

## Quick Diagnosis Checklist

### Step 1: Check Application Logs
When you assign a student to a class, look for these log messages:

**✅ Good - Logs show email sending:**
```
[Email] Starting email sending process...
[Email] Sending emails to 3 recipient(s)
[Email] Preparing email for alice@transcendai.com...
[Email] Calling AWS SES.sendEmail() for alice@transcendai.com...
[Email] ✅ Email sent to alice@transcendai.com (teacher). MessageId: 000001234...
[Email] Email sending complete. Sent: 3/3
```

**❌ Bad - Missing these logs:**
If you don't see any `[Email]` entries, the problem is in the fetch call or API route.

---

## Root Cause Analysis

### Possible Cause 1: AWS Credentials Not Loaded in Coolify

**Signs**:
- Logs show: `[Email] ❌ AWS credentials not fully configured. Missing: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY`

**Fix**:
1. Go to Coolify Project Settings
2. Check **Environment Variables**
3. Verify these 4 variables are present:
   - `AWS_ACCESS_KEY_ID` = `<your-key>`
   - `AWS_SECRET_ACCESS_KEY` = `<your-secret>`
   - `AWS_REGION` = `us-east-2`
   - `AWS_SES_FROM_EMAIL` = `admin@9jacodekids.com`
4. Redeploy the application after adding/fixing variables

**Verification**: After deployment, check logs again. You should see:
```
[Email] Initializing AWS SES with: {
  hasAccessKey: true,
  hasSecretKey: true,
  region: 'us-east-2',
  fromEmail: 'admin@9jacodekids.com'
}
```

---

### Possible Cause 2: API Request Never Reaches the Endpoint

**Signs**:
- Browser shows student was assigned successfully
- But NO `[Email]` logs appear
- Check browser console (F12 → Console tab)

**Browser Console Check**:
- Look for: `[Email] Enrollment emails sent: { teachers: 1, students: 1, parents: 1 }`
- If not there, look for errors like:
  - `Failed to fetch`
  - `401 Unauthorized`
  - Network error

**Fix if 401 Unauthorized**:
```
This means the session is invalid. Refresh the page and log in again.
```

**Fix if Network Error**:
```
Check that Coolify application is running and accessible.
Verify API endpoint URL is correct.
```

---

### Possible Cause 3: AWS SES Rejected the Request

**Signs**:
```
[Email] Calling AWS SES.sendEmail() for sales@9jacodekids.com...
[Email] ❌ Failed to send email to sales@9jacodekids.com: {
  error: 'MessageRejected',
  code: 'MessageRejected'
}
```

**Possible Issues**:
1. **Email address not verified in AWS SES**
   - Solution: Go to AWS SES console, verify the email address

2. **AWS credentials are invalid/revoked**
   - Solution: Generate new AWS credentials and update Coolify environment variables

3. **Account in sandbox mode**
   - Solution: Request production access in AWS SES console

4. **Daily/rate limit exceeded**
   - Solution: Check AWS SES quota (should be 50,000/day)

---

### Possible Cause 4: Database Data Missing

**Signs**:
```
[Email] Sending emails to 1 recipient(s)
```
Only 1 email instead of expected 3 (teacher + student + parent).

**Possible Issues**:
1. Student email is NULL in database
2. Parent email is NULL in database
3. Teacher email is NULL in database

**Check Database**:
```sql
-- Check student data
SELECT firstName, lastName, email, parentEmail FROM "Student" WHERE firstName = 'Emma';

-- Check teacher data
SELECT firstName, lastName, email FROM "Teacher" WHERE firstName = 'Alice';

-- Check class data
SELECT name, batch FROM "Class" WHERE id = '<class-id>';
```

If any email is NULL, that recipient won't receive an email (this is correct behavior).

---

## Step-by-Step Troubleshooting

### Step 1: Check Application is Running
```
1. Open Coolify dashboard
2. Check application status (should show "Running")
3. Check recent logs for any startup errors
```

### Step 2: Check AWS Credentials in Coolify
```
1. Go to Project Settings → Environment Variables
2. Verify all 4 variables are present with correct values
3. If changed, trigger redeploy
4. Wait 2-3 minutes for deployment to complete
```

### Step 3: Test Student Assignment
```
1. Log in as: admin@9jacodekids.com / Admin@123
2. Go to Students → Emma Wilson
3. Click "Assign to Class"
4. Select program, batch, class
5. Click "Assign"
6. DO NOT close the page yet
```

### Step 4: Check Browser Console
```
1. Press F12 (Developer Tools)
2. Go to Console tab
3. Look for messages starting with "[Email]"
4. Check for any red error messages
5. Screenshot if needed for debugging
```

### Step 5: Check Application Logs
```
In Coolify:
1. Go to Application → Logs
2. Look for "[Email]" entries
3. Read the full sequence of log messages
4. If logs not visible, click "Refresh" or "Stream Logs"
```

### Step 6: Check Email Inbox
```
1. Wait at least 30 seconds
2. Check these email addresses:
   - info@9jacodekids.com (Emma's student email)
   - sales@9jacodekids.com (Emma's parent email)
   - alice@transcendai.com (Teacher Alice)
3. Check Spam/Junk folders too
4. Look for email subject: "Class Assignment - January Weekend Code Club 2025 Batch 1"
```

### Step 7: Check AWS SES Dashboard
```
1. Go to AWS SES Console (us-east-2 region)
2. Check "Sending Statistics" or "Metrics"
3. Look for:
   - Send count increased
   - No bounces
   - No complaints
4. If send count didn't increase, AWS never received the request
```

---

## Log Examples

### ✅ Successful Email Sending

```
[Email] Starting email sending process...
[Email] Sending emails to 3 recipient(s)
[Email] Initializing AWS SES with: {
  hasAccessKey: true,
  hasSecretKey: true,
  region: 'us-east-2',
  fromEmail: 'admin@9jacodekids.com'
}
[Email] Preparing email for alice@transcendai.com...
[Email] Calling AWS SES.sendEmail() for alice@transcendai.com...
[Email] ✅ Email sent to alice@transcendai.com (teacher). MessageId: 0000015e5c1e-1234-5678-1234-567890abcdef
[Email] Preparing email for info@9jacodekids.com...
[Email] Calling AWS SES.sendEmail() for info@9jacodekids.com...
[Email] ✅ Email sent to info@9jacodekids.com (student). MessageId: 0000015e5c1e-1234-5678-1234-567890abcdef
[Email] Preparing email for sales@9jacodekids.com...
[Email] Calling AWS SES.sendEmail() for sales@9jacodekids.com...
[Email] ✅ Email sent to sales@9jacodekids.com (parent). MessageId: 0000015e5c1e-1234-5678-1234-567890abcdef
[Email] Email sending complete. Sent: 3/3
```

### ❌ Missing AWS Credentials

```
[Email] Starting email sending process...
[Email] Sending emails to 3 recipient(s)
[Email] Initializing AWS SES with: {
  hasAccessKey: false,
  hasSecretKey: false,
  region: 'us-east-1',
  fromEmail: undefined
}
[Email] ❌ AWS credentials are missing!
[Email] AWS_ACCESS_KEY_ID: MISSING
[Email] AWS_SECRET_ACCESS_KEY: MISSING
[Email] ❌ AWS credentials not fully configured. Missing: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SES_FROM_EMAIL
```

**Fix**: Add AWS environment variables to Coolify

---

### ❌ SES Rejected Email

```
[Email] Starting email sending process...
[Email] Sending emails to 1 recipient(s)
[Email] Preparing email for alice@transcendai.com...
[Email] Calling AWS SES.sendEmail() for alice@transcendai.com...
[Email] ❌ Failed to send email to alice@transcendai.com: {
  error: 'Email address not verified. The following identities failed the check',
  code: 'MessageRejected'
}
```

**Fix**: Verify email address in AWS SES console

---

### ⚠️ Missing Database Data

```
[Email] Starting email sending process...
[Email] Sending emails to 2 recipient(s)
```

Only 2 recipients (teacher + student) instead of 3. Parent email was NULL in database, so it was skipped (this is correct).

---

## Information to Include When Reporting Issues

If emails still don't arrive, collect this information and share:

1. **Full log output** from application when assigning a student
2. **Browser console screenshot** (F12 → Console)
3. **AWS environment variables** (without the actual keys, just confirm they're set)
4. **Student data** from database:
   ```sql
   SELECT firstName, lastName, email, parentEmail FROM "Student" WHERE id = '<student-id>';
   ```
5. **Teacher data** from database:
   ```sql
   SELECT firstName, lastName, email FROM "Teacher" WHERE id = '<teacher-id>';
   ```
6. **Class data** from database:
   ```sql
   SELECT name, batch, slot, schedule FROM "Class" WHERE id = '<class-id>';
   ```
7. **AWS SES verified email list** screenshot
8. **AWS SES metrics** screenshot (showing send count)

---

## Common Solutions

### Issue: Environment variables not loading after adding them

**Solution**:
1. Add the environment variables in Coolify
2. Redeploy the application
3. Wait 2-3 minutes for rebuild
4. Refresh browser and try again

---

### Issue: Emails sent to AWS but not delivered

**Solution**:
1. Check if recipient email is in spam folder
2. Check if email is verified in AWS SES
3. Verify AWS SES is not in sandbox mode
4. Check AWS SES delivery metrics for bounces

---

### Issue: API returns 401 Unauthorized

**Solution**:
1. Refresh the page
2. Log out and log back in
3. Try assigning again

---

### Issue: Student assignment succeeds but no emails sent

**Solution**:
1. Check application logs for `[Email]` entries
2. If no logs, the fetch might be failing
3. Check browser console for network errors
4. Verify `/api/emails/send-enrollment` endpoint exists

---

## Testing Without Coolify

If you want to test locally first:

```bash
# 1. Make sure .env has AWS credentials
cat .env | grep AWS

# 2. Start the application
npm run dev

# 3. Run the test script
node test-email.js

# Expected output should show:
# ✅ SES Account Status
# ✅ Verified Email Addresses
# ✅ Email Sent Successfully
```

---

## Next Steps

1. **Check logs** using the troubleshooting steps above
2. **Verify AWS environment variables** in Coolify
3. **Redeploy** if variables were added/changed
4. **Test again** by assigning a student
5. **Collect logs** if still not working
6. **Share logs** with debugging information

The improved logging (commit `ad307c0`) will help identify exactly where the issue is occurring.

---

## Recent Changes

**Commit ad307c0**: Improved email service with detailed logging
- Added SES initialization logging
- Added step-by-step email sending logs
- Added specific error code reporting
- Added credential validation with missing variable details

These logs will help identify the root cause of the email sending issue.

---

**Debug systematically. Start with logs, then check environment variables, then verify AWS configuration.**
