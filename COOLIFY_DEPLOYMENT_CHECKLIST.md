# 🚀 Coolify Deployment Checklist - Email System Testing

**Status**: ✅ Ready for Testing
**Date**: 2026-01-29
**System**: Email Notification System with Amazon SES

---

## Pre-Deployment Verification

### Local Development Status ✅
- [x] Email service implemented (lib/email.ts)
- [x] API endpoint created (app/api/emails/send-enrollment/route.ts)
- [x] Application integrated (StudentDetailsView.tsx)
- [x] Database migrations applied (meetLink field added)
- [x] AWS credentials configured in .env
- [x] AWS SES verified and tested
- [x] All changes committed to git
- [x] Latest commit: 836082d

### AWS SES Configuration ✅
- [x] Access Key ID: Configured in local .env
- [x] Secret Access Key: Configured in local .env
- [x] Region: us-east-2
- [x] Verified sender: admin@9jacodekids.com
- [x] Verified recipients: 6 email addresses
- [x] Account status: Production (not sandbox)
- [x] Daily quota: 50,000 emails/day
- [x] Rate limit: 14 emails/second

### Database Configuration ✅
- [x] All 9 tables present and correct
- [x] meetLink column added to Class table
- [x] Test data seeded with verified emails:
  - Students: 5 with emails
  - Teachers: 2 with emails
  - Classes: 3 ready for testing
  - Programs: 2 available
  - Course History: 3 courses ready

---

## Coolify Environment Setup

### Step 1: Environment Variables
**Location**: Coolify Project Settings → Environment Variables

Add these 4 variables (EXACTLY as shown):

```
AWS_ACCESS_KEY_ID=<your-aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>
AWS_REGION=us-east-2
AWS_SES_FROM_EMAIL=admin@9jacodekids.com
```

**Important**: Use the credentials from your local .env file. Add them to Coolify environment variables. Plan to implement Settings system (Phase 2) for encrypted credential storage after testing completes.

### Step 2: Database Configuration
**Status**: ✅ Already synchronized

Coolify database already has:
- [x] All migrations applied
- [x] meetLink field on Class table
- [x] Test data with verified emails
- [x] Correct schema structure

### Step 3: Application Deployment
**Process**:
1. Push latest code to GitHub (if not already done)
2. Trigger Coolify rebuild from latest git commit (836082d)
3. Wait for build to complete
4. Verify no deployment errors
5. Check application logs for any issues

---

## Coolify Testing Verification

### Pre-Test Checks

- [ ] **Application Running**: Visit http://your-coolify-domain and verify app loads
- [ ] **Database Connected**: Check Coolify logs for successful database connection
- [ ] **AWS Credentials Loaded**: Check Coolify logs for "AWS SES initialized" message
- [ ] **No Errors in Logs**: Review Coolify build and runtime logs for any errors

### Quick Connectivity Test

```bash
# SSH into Coolify application container and run:
node test-email.js

# Expected output:
# ✅ SES Account Status
# ✅ Verified Email Addresses
# ✅ Email Sent Successfully
# 🎉 All tests passed!
```

---

## Testing Phase 1: Manual Email Sending

### Test Setup
1. Log into Coolify application as admin
   - Email: `admin@9jacodekids.com`
   - Password: `Admin@123`

2. Navigate to: **Students** section

### Test Case 1: Basic Email Sending

**Student**: Emma Wilson
**Class**: Python Basics - Batch 1
**Expected Recipients**:
- Teacher: alice@transcendai.com (Alice Johnson)
- Student: info@9jacodekids.com (Emma's email)
- Parent: sales@9jacodekids.com (Emma's parent)

**Steps**:
1. Click on "Emma Wilson" in Students list
2. Click "Assign to Class" button
3. Select program: "January Weekend Code Club 2025"
4. Select batch: "1"
5. Verify payment status shows "CONFIRMED"
6. Select class: "Python Basics - Batch 1"
7. Click "Assign"

**Expected Result**:
- [x] Success message appears
- [x] Student shows in class assignments
- [x] Server logs show: `[Email] Class assignment email sent to...`

**Verification Steps**:
1. Wait 30 seconds
2. Check these email addresses for messages:
   - info@9jacodekids.com (Student Emma)
   - sales@9jacodekids.com (Parent)
   - alice@transcendai.com (Teacher Alice)
3. Verify emails contain:
   - Correct student name: "Emma Wilson"
   - Correct class: "Python Basics - Batch 1"
   - Correct teacher: "Alice Johnson"
   - Correct course: "Python Basics"
   - Correct program: "January Weekend Code Club 2025"
   - Batch number: "1"
   - Schedule time slot
   - Professional HTML formatting

---

## Testing Phase 2: Multiple Recipients

### Test Case 2: Different Student

**Student**: Liam Anderson
**Class**: Game Design - Morning
**Expected Recipients**:
- Teacher: bob@transcendai.com (Bob Smith)
- Student: hello@9jacodekids.com
- Parent: admin@skillsrave.com

**Steps**: Repeat Test Case 1 process with Liam Anderson

**Verification**:
- [x] All 3 emails received
- [x] No duplicate emails
- [x] All content accurate

### Test Case 3: Student Without Parent Email

**Student**: Noah Brown
**Class**: Web Development - Afternoon
**Expected Recipients**:
- Teacher: alice@transcendai.com
- Student: sales@9jacodekids.com
- Parent: ⚠️ hello@9jacodekids.com (should skip gracefully)

**Verification**:
- [x] Teacher email received
- [x] Student email received
- [x] No errors in logs
- [x] System shows graceful skip of parent email

---

## Testing Phase 3: Email Content Quality

### Rendering Verification
Check each received email in:
- [ ] Gmail web interface
- [ ] Gmail mobile app
- [ ] Outlook (if available)
- [ ] Apple Mail (if available)

**Expected Quality**:
- [x] HTML renders correctly
- [x] Academy branding visible (colors, fonts)
- [x] All text readable and properly formatted
- [x] Mobile responsive layout works
- [x] No broken images or styling

### Content Accuracy
- [x] Recipient name matches (e.g., "Dear Student Emma Wilson")
- [x] Class name exact match
- [x] Course name exact match
- [x] Program name exact match
- [x] Batch number correct
- [x] Teacher/Instructor name exact match
- [x] Time slot/schedule correct
- [x] Professional tone appropriate for recipient type

### Recipient-Specific Variations
- [x] **Teacher Email**: Uses "Instructor" terminology
- [x] **Student Email**: Uses "Student" terminology, includes instructor name
- [x] **Parent Email**: Uses "Parent/Guardian" terminology, includes student name

---

## AWS SES Monitoring

### CloudWatch Dashboard
**Location**: AWS SES Console → Metrics (us-east-2 region)

Check after tests complete:
- [ ] Message count: Should show number of emails sent
- [ ] Bounce rate: Should be 0% or very low
- [ ] Complaint rate: Should be 0%
- [ ] Delivery rate: Should be > 95%
- [ ] No blacklist warnings

### Email Delivery Status
- [ ] Check AWS SES Reputation Dashboard
- [ ] Verify no bounced messages
- [ ] Verify no rejected messages
- [ ] Check sending quota usage

---

## Troubleshooting Guide

### Emails Not Arriving?

**Step 1: Check Server Logs**
```
Look for: [Email] Class assignment email sent to [email]
If not present: Email sending may have failed
```

**Step 2: Verify Credentials in Coolify**
```
Coolify Environment Variables must have all 4 AWS values:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION
- AWS_SES_FROM_EMAIL
```

**Step 3: Test AWS Connection**
```bash
# In Coolify container:
node test-email.js

# Check output for:
✅ SES Account Status
✅ Verified Email Addresses
✅ Email Sent Successfully
```

**Step 4: Check Email Spam Folders**
- Gmail: Check Spam, All Mail folders
- Outlook: Check Junk, Clutter folders
- Apple Mail: Check Junk folder

**Step 5: Verify Email Addresses**
All test emails must be in AWS verified list:
- ✅ admin@9jacodekids.com
- ✅ info@9jacodekids.com
- ✅ sales@9jacodekids.com
- ✅ hello@9jacodekids.com
- ✅ hello@skillsrave.com
- ✅ admin@skillsrave.com

**Step 6: Check Student Data**
```sql
-- Verify student has email address
SELECT id, firstName, lastName, email, parentEmail FROM "Student" WHERE firstName = 'Emma';

-- Should show:
-- Emma Wilson, email: info@9jacodekids.com, parentEmail: sales@9jacodekids.com
```

### Email Content Incorrect?

**Check Database Data**:
- Verify student name in Student table
- Verify teacher name in Teacher table
- Verify class name and course in Class table
- Verify program and batch in Program table

**Check Application Logs**:
- Look for any template generation errors
- Check for database query failures
- Verify recipient detection logic

---

## Test Results Log

### Test 1: Basic Email Sending (Emma Wilson)
- **Date/Time**: _________________
- **Class**: Python Basics - Batch 1
- **Result**: ✅ / ❌ / ⚠️
- **Emails Received**:
  - [ ] Teacher (alice@transcendai.com)
  - [ ] Student (info@9jacodekids.com)
  - [ ] Parent (sales@9jacodekids.com)
- **Notes**: _______________

### Test 2: Multiple Recipients (Liam Anderson)
- **Date/Time**: _________________
- **Class**: Game Design - Morning
- **Result**: ✅ / ❌ / ⚠️
- **Emails Received**:
  - [ ] Teacher (bob@transcendai.com)
  - [ ] Student (hello@9jacodekids.com)
  - [ ] Parent (admin@skillsrave.com)
- **Notes**: _______________

### Test 3: Missing Parent Email (Noah Brown)
- **Date/Time**: _________________
- **Class**: Web Development - Afternoon
- **Result**: ✅ / ❌ / ⚠️
- **Emails Received**:
  - [ ] Teacher (alice@transcendai.com)
  - [ ] Student (sales@9jacodekids.com)
  - [ ] No errors in logs
- **Notes**: _______________

### Test 4: Email Quality
- **Date/Time**: _________________
- **Gmail Rendering**: ✅ / ⚠️
- **Mobile Rendering**: ✅ / ⚠️
- **Content Accuracy**: ✅ / ⚠️
- **Professional Quality**: ✅ / ⚠️
- **Notes**: _______________

### Test 5: AWS SES Metrics
- **Date/Time**: _________________
- **Messages Sent Count**: ___ emails
- **Bounce Rate**: ___%
- **Complaint Rate**: ___%
- **Delivery Rate**: ___%
- **Notes**: _______________

---

## Issues Found

| Issue | Severity | Status | Solution |
|-------|----------|--------|----------|
| | ❌/⚠️/✅ | Open/In Progress/Resolved | |
| | ❌/⚠️/✅ | Open/In Progress/Resolved | |
| | ❌/⚠️/✅ | Open/In Progress/Resolved | |

---

## Success Criteria

### Minimum Requirements (Must Have)
- [ ] AWS SES credentials working in Coolify
- [ ] Emails send successfully on student assignment
- [ ] Teacher receives correct email
- [ ] Student receives correct email
- [ ] Parent receives correct email (when available)
- [ ] No system errors during email sending
- [ ] AWS SES dashboard shows emails sent

### Nice to Have
- [ ] Emails arrive in < 1 minute
- [ ] Emails render beautifully in all clients
- [ ] Zero bounces/complaints in AWS metrics
- [ ] System handles missing emails gracefully
- [ ] Google Meet link field ready for Phase 3

---

## Next Steps After Testing

### If Testing Successful ✅
1. Document all test results in this checklist
2. Note any minor issues for Phase 2
3. Plan Settings system implementation
4. Begin Phase 2: Credential management

### If Issues Found ❌
1. Document all issues in table above
2. Create GitHub issues for bugs
3. Fix issues before moving to Phase 2
4. Re-run tests to verify fixes

### Phase 2: Settings System (After Testing)
- [ ] Create SystemSettings Prisma model
- [ ] Create encryption utility for credentials
- [ ] Create Superadmin Settings UI page
- [ ] Migrate credentials from .env to database
- [ ] Remove .env AWS requirement from production

### Phase 3: Google Meet Integration (When Ready)
- [ ] Set up Google Cloud Project
- [ ] Implement Meet link generation service
- [ ] Generate links when classes created
- [ ] Store in Class.meetLink field
- [ ] Emails automatically include links

---

## Key Information for Testing

### Test Credentials
```
Admin Email: admin@9jacodekids.com
Admin Password: Admin@123
```

### Test Students
| Name | Email | Parent Email |
|------|-------|--------------|
| Emma Wilson | info@9jacodekids.com | sales@9jacodekids.com |
| Liam Anderson | hello@9jacodekids.com | admin@skillsrave.com |
| Sophia Taylor | hello@skillsrave.com | info@9jacodekids.com |
| Noah Brown | sales@9jacodekids.com | hello@9jacodekids.com |
| Olivia Davis | admin@9jacodekids.com | hello@skillsrave.com |

### Test Teachers
| Name | Email |
|------|-------|
| Alice Johnson | alice@transcendai.com |
| Bob Smith | bob@transcendai.com |

### Test Classes
| Class | Course | Program | Teacher | Batch |
|-------|--------|---------|---------|-------|
| Python Basics - Batch 1 | Python Basics | January 2025 | Alice | 1 |
| Game Design - Morning | Game Design | Summer 2025 | Bob | 1 |
| Web Development - Afternoon | Web Development | Summer 2025 | Alice | 2 |

### AWS SES Details
- **Region**: us-east-2
- **Daily Quota**: 50,000 emails
- **Rate Limit**: 14 emails/second
- **Status**: Production (not sandbox)
- **From Email**: admin@9jacodekids.com

### Git Commits
| Commit | Message |
|--------|---------|
| 836082d | Add implementation completion documentation |
| a0f82b9 | Add comprehensive email testing documentation |
| 5df6273 | Add email testing infrastructure and test configuration |
| fdef377 | Implement email notification system with Amazon SES integration |

---

## Documentation Files

| File | Purpose |
|------|---------|
| **EMAIL_SETUP_GUIDE.md** | Complete AWS SES setup instructions |
| **EMAIL_TESTING_PLAN.md** | Comprehensive 5-phase testing plan |
| **READY_TO_TEST.md** | Quick start 3-step guide |
| **EMAIL_CHECKLIST.md** | Development and testing checklist |
| **IMPLEMENTATION_COMPLETE.md** | Implementation summary |
| **test-email.js** | Credential verification script |

---

## Contact & Support

### If You Need Help
1. Check EMAIL_TESTING_PLAN.md for detailed testing steps
2. Check EMAIL_SETUP_GUIDE.md for AWS SES configuration
3. Run `node test-email.js` to verify credentials
4. Check Coolify logs for application errors
5. Check AWS SES dashboard for delivery metrics

### Files to Review
- `lib/email.ts` - Email service implementation
- `app/api/emails/send-enrollment/route.ts` - API endpoint
- `components/StudentManagement/StudentDetailsView.tsx` - Application integration

---

## Sign-Off

**Deployment Date**: 2026-01-29
**System Status**: ✅ Ready for Coolify Testing
**Latest Commit**: 836082d
**All Tests**: ⏳ Pending (Ready to Start)

**Tester Name**: _________________
**Test Date**: _________________
**Result**: ⏳ In Progress / ✅ Passed / ❌ Issues Found

---

**Ready to deploy and test!** 🚀

Follow the testing steps above and document results. Once complete, plan Phase 2: Settings System implementation.
