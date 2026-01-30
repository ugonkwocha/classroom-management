# 📋 Where to Find Application Logs

**Purpose**: Locate the logs to see if emails are being sent successfully

---

## If Running in Coolify (Production)

### Method 1: Coolify Dashboard - Real-Time Logs

**Steps**:
1. Open Coolify dashboard in browser
2. Go to your **Classroom Management** project
3. Click on the **Application** name (e.g., "classroom-management")
4. Look for **Logs** section (usually on the left menu or top tabs)
5. Click **"View Logs"** or **"Stream Logs"**

**What you'll see**:
- Real-time application output
- All `[Email]` messages appear here
- Green = success, Red = errors

**To find the assignment logs**:
1. Assign a student to a class (in the app)
2. Immediately look at the logs
3. Scroll down to find `[Email]` entries
4. You should see messages like:
   ```
   [Email] Starting email sending process...
   [Email] Sending emails to 3 recipient(s)
   ```

---

### Method 2: Coolify Terminal/SSH

If you want to SSH into the Coolify container:

**Steps**:
1. In Coolify dashboard, find your application
2. Look for **Console** or **Terminal** option
3. Click to open terminal
4. Run:
   ```bash
   # See recent logs
   tail -100 /var/log/application.log

   # Or watch logs in real-time
   tail -f /var/log/application.log
   ```

**Note**: The exact log path depends on Coolify configuration. Check Coolify docs for your version.

---

### Method 3: Coolify Activity/Events Tab

Some Coolify versions show logs in:
1. Application → **Activity** tab
2. Application → **Events** tab
3. Look for recent email-related entries

---

## If Running Locally (npm run dev)

### Method 1: Terminal Output (Easiest)

**Steps**:
1. Open terminal where you ran `npm run dev`
2. The logs appear directly in the terminal
3. Look for messages with `[Email]` prefix

**Example output**:
```
[Email] Starting email sending process...
[Email] Sending emails to 3 recipient(s)
[Email] Preparing email for alice@transcendai.com...
[Email] ✅ Email sent to alice@transcendai.com (teacher). MessageId: 0000015e5c1e...
```

**To see only email logs**:
```bash
# In a separate terminal, watch for email logs
tail -f [your-log-file] | grep "\[Email\]"
```

---

### Method 2: Browser Developer Console

**Steps**:
1. While the app is running in browser
2. Press **F12** (or right-click → Inspect)
3. Go to **Console** tab
4. Look for messages starting with `[Email]`

**What you'll see**:
```
[Email] Enrollment emails sent: { teachers: 1, students: 1, parents: 1 }
```

This confirms the browser received a response from the API.

---

### Method 3: Browser Network Tab

**Steps**:
1. Press **F12** → **Network** tab
2. Assign a student to a class
3. Look for request to `/api/emails/send-enrollment`
4. Click it to see:
   - **Response** tab: Shows if API returned success
   - **Headers** tab: Shows request details

**What success looks like**:
```json
{
  "success": true,
  "emailsSent": {
    "teachers": 1,
    "students": 1,
    "parents": 1
  }
}
```

**What failure looks like**:
```json
{
  "error": "AWS credentials not configured"
}
```

---

## Detailed Logs from Each Location

### Coolify Application Logs - Full Detail

This is the **best place** to look. You'll see:

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
[Email] ✅ Email sent to alice@transcendai.com (teacher). MessageId: 0000015e5c1e-abc-def-123-456789
[Email] Preparing email for info@9jacodekids.com...
[Email] Calling AWS SES.sendEmail() for info@9jacodekids.com...
[Email] ✅ Email sent to info@9jacodekids.com (student). MessageId: 0000015e5c1e-xyz-123-456-789abc
[Email] Preparing email for sales@9jacodekids.com...
[Email] Calling AWS SES.sendEmail() for sales@9jacodekids.com...
[Email] ✅ Email sent to sales@9jacodekids.com (parent). MessageId: 0000015e5c1e-123-456-789-abcdef
[Email] Email sending complete. Sent: 3/3
```

---

### Browser Console - Simple Output

This is **less detailed** but shows the API response:

```
[Email] Enrollment emails sent: { teachers: 1, students: 1, parents: 1 }
```

---

### API Response - Technical Details

This shows the **HTTP response**:

```json
{
  "success": true,
  "emailsSent": {
    "teachers": 1,
    "students": 1,
    "parents": 1
  }
}
```

---

## Step-by-Step: How to Find and Check Logs

### If in Coolify:

```
1. Open Coolify dashboard
2. Click your project name
3. Click the application
4. Click "Logs" or "View Logs"
5. Assign a student to a class in the web app
6. Immediately look at the logs
7. Search for [Email] entries
8. Read the messages
```

### If on Local Development:

```
1. Look at terminal where you ran "npm run dev"
2. Assign a student to a class
3. Check terminal for [Email] entries
4. Read the messages
```

---

## What to Look For

### ✅ Success Signs
- `[Email] ✅ Email sent to...`
- `EmailId:` followed by message ID
- `Email sending complete. Sent: 3/3`

### ❌ Failure Signs
- `[Email] ❌ Failed to send email...`
- `AWS credentials not fully configured`
- `MessageRejected`
- No `[Email]` logs at all

---

## If You Don't See Any [Email] Logs

**This means**: The API endpoint wasn't called.

**Check**:
1. Browser console (F12 → Console tab)
   - Look for `[Email] Enrollment emails sent...`
   - Or look for error messages
2. Browser network tab (F12 → Network tab)
   - Look for request to `/api/emails/send-enrollment`
   - Check if it's red (failed) or green (success)
3. Application status
   - Is it running?
   - Did deployment succeed?

---

## Quick Checklist

| Where | How | What to Look For |
|-------|-----|------------------|
| **Coolify Logs** | Dashboard → Application → Logs | `[Email]` entries and status |
| **Local Terminal** | Terminal output | `[Email]` entries and status |
| **Browser Console** | F12 → Console tab | `[Email] Enrollment emails sent` |
| **Browser Network** | F12 → Network tab | `/api/emails/send-enrollment` request |
| **AWS SES Dashboard** | aws.amazon.com → SES | Send count increased? |

---

## For Coolify Users

**Most Important**: Check the **Coolify Application Logs** immediately after assigning a student.

1. Go to Coolify dashboard
2. Open your project
3. Click the application
4. Go to **Logs**
5. Assign a student to a class
6. Look for `[Email]` messages
7. Read what they say

The logs will tell you:
- If AWS credentials loaded ✅ or not ❌
- If emails were sent ✅ or rejected ❌
- What the specific error is if something failed ❌

---

## Saving Logs for Debugging

If you need to save logs to share:

### Coolify:
1. In the Logs section, look for "Download" or "Export" button
2. Or manually copy/paste the relevant sections

### Local:
```bash
# Save last 50 lines of logs to a file
npm run dev 2>&1 | tee logs.txt
# Then email logs.txt
```

---

## Example: Full Log Session

**What you'll see when everything works**:

```
...
[Email] Starting email sending process...
[Email] Sending emails to 3 recipient(s)
[Email] Initializing AWS SES with: { hasAccessKey: true, hasSecretKey: true, region: 'us-east-2', fromEmail: 'admin@9jacodekids.com' }
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
...
```

This tells you all 3 emails were sent successfully!

---

## Common Issues with Logs

### Issue: "I don't see any logs"
**Solution**:
- In Coolify, click "Refresh" or "Stream Logs"
- Make sure application is running
- Try assigning a student again

### Issue: "Logs show old messages, not new ones"
**Solution**:
- Click "Clear" to clear old logs
- Assign a student again
- Immediately check logs

### Issue: "Too many logs, can't find [Email] entries"
**Solution**:
- Use browser search (Ctrl+F or Cmd+F)
- Search for `[Email]`
- This highlights all email-related messages

---

## Summary

**For Coolify testing**:
1. Go to Coolify dashboard → Application → Logs
2. Assign a student to a class
3. Immediately look at logs and search for `[Email]`
4. Read the messages to see success or errors

**For local testing**:
1. Look at terminal where you ran `npm run dev`
2. Assign a student to a class
3. Look for `[Email]` messages in terminal
4. Read what they say

**The logs will tell you exactly what's happening!** 📋
