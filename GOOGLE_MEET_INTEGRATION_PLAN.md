# 🎥 Google Meet Integration - Implementation Plan

**Status**: Planning Phase
**Date**: 2026-01-29
**Objective**: Generate Google Meet links automatically for each class

---

## Overview

When a class is created, the system will automatically generate a unique Google Meet link and store it in the `Class.meetLink` field. The link will be included in notification emails sent to teachers, students, and parents.

---

## Prerequisites

### What You Already Have

✅ **Database field exists**: `Class.meetLink` (text field, nullable)
✅ **Email system supports Meet links**: HTML templates include button for Meet link
✅ **API endpoint ready**: `/api/emails/send-enrollment` can include Meet links
✅ **Frontend ready**: Student view can display Meet links

### What You Need

❌ **Google Cloud Project** with:
- Calendar API enabled
- Service account credentials
- Appropriate OAuth scopes

❌ **Environment variables** for:
- Google service account key file
- Google project ID
- Google calendar email

---

## Architecture Overview

```
┌──────────────────────────────────┐
│   Class Creation in UI            │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  POST /api/classes               │
│  (Create new class)              │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  Backend validates class data    │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  Call Meet Link Generation       │
│  lib/googleMeet.ts              │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  Google Calendar API             │
│  Create event with Meet link     │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  Return Meet URL                 │
│  (e.g., meet.google.com/abc-def) │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  Save to database                │
│  Class.meetLink = URL            │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  Class created successfully      │
│  Meet link ready for emails      │
└──────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Google Cloud Project Setup (Manual - User Action)

**User must do this first**:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project (or select existing): "9jacodekids"
3. Enable these APIs:
   - Google Calendar API
   - Google Meet API (if available)
4. Create Service Account:
   - Go to "Service Accounts"
   - Click "Create Service Account"
   - Name: "academy-enrollment"
   - Grant roles:
     - Editor (for testing)
     - Calendar Service Account (for Calendar API)
5. Create and download JSON key file
6. Add service account email to Google Calendar as "owner"

**Environment Variables to Set**:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL="academy@projectid.iam.gserviceaccount.com"
GOOGLE_PROJECT_ID="9jacodekids-12345"
GOOGLE_CALENDAR_ID="academy@9jacodekids.com"
GOOGLE_SERVICE_ACCOUNT_KEY="<base64-encoded-key-file>"
```

### Phase 2: Create Google Meet Service (Development)

**File**: `lib/googleMeet.ts`

```typescript
import { google } from 'googleapis';

interface CreateMeetLinkResponse {
  success: boolean;
  meetLink?: string;
  error?: string;
}

export async function generateMeetLink(
  classData: {
    name: string;
    courseId: string;
    schedule: string;
    slot: string;
  }
): Promise<CreateMeetLinkResponse> {
  // Implementation to follow
}
```

**Key Functions**:
- `generateMeetLink()` - Creates calendar event with Meet link
- `validateCredentials()` - Checks Google credentials are valid
- `createCalendarEvent()` - Creates event in Google Calendar
- `extractMeetUrl()` - Extracts meet.google.com URL from event

### Phase 3: Integration with Class Creation API

**File**: `app/api/classes/route.ts`

**Changes**:
1. Check if `GOOGLE_SERVICE_ACCOUNT_KEY` is set
2. If set, call `generateMeetLink()` before saving
3. Include `meetLink` in database save
4. Return `meetLink` in response

```typescript
// In POST /api/classes
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  const meetLinkResponse = await generateMeetLink({
    name: data.name,
    courseId: data.courseId,
    schedule: data.schedule,
    slot: data.slot,
  });

  if (meetLinkResponse.success) {
    classData.meetLink = meetLinkResponse.meetLink;
  } else {
    console.warn('Failed to generate Meet link:', meetLinkResponse.error);
  }
}
```

### Phase 4: Update Class Edit Endpoint

**File**: `app/api/classes/[id]/route.ts`

**Changes**:
- If class name/schedule changes, regenerate Meet link
- Or allow manual Meet link entry
- Keep existing Meet link if not changing

### Phase 5: Frontend Display

**Files to Update**:
- `components/ClassManagement/ClassForm.tsx` - Show Meet link in class form
- `components/StudentManagement/StudentDetailsView.tsx` - Display Meet link when viewing classes
- `components/ClassManagement/ClassList.tsx` - Show Meet link status in list

**What to Display**:
- ✅ "Google Meet link created" indicator
- ✅ Link to copy (for testing)
- ✅ Link in class details view
- ✅ Link in email confirmations

---

## Environment Variables Required

```bash
# Google Cloud Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL="academy@9jacodekids.iam.gserviceaccount.com"
GOOGLE_PROJECT_ID="9jacodekids-12345"
GOOGLE_CALENDAR_ID="academy@9jacodekids.com"

# Service account key (base64 encoded JSON file)
GOOGLE_SERVICE_ACCOUNT_KEY="eyJz..."

# Optional: Google Meet API key (if using Meet API directly)
GOOGLE_MEET_API_KEY="AIzaSyD..."
```

---

## Implementation Timeline

### Immediate (This Session)
- [ ] Create implementation plan ✓ (This document)
- [ ] Set up Google Cloud Project (User action)
- [ ] Create `lib/googleMeet.ts` service
- [ ] Test Meet link generation locally

### Short Term (This Week)
- [ ] Integrate with class creation API
- [ ] Add Meet link display to UI
- [ ] Test end-to-end flow
- [ ] Update emails to include Meet link

### Medium Term (Next Week)
- [ ] Add Meet link regeneration functionality
- [ ] Add Meet link to class list view
- [ ] Performance optimization

### Long Term (Future)
- [ ] Settings system for Google credentials (Phase 2)
- [ ] Automatic calendar management
- [ ] Meet recording storage integration
- [ ] Zoom as alternative provider

---

## Testing Strategy

### Local Testing

1. **Create test Google Cloud Project**
   - Use free tier
   - Don't worry about production settings yet

2. **Generate test Meet link**
   ```bash
   npm run test:meet-link
   # Should output: meet.google.com/abc-defg-hij
   ```

3. **Verify in database**
   ```sql
   SELECT name, meetLink FROM "Class" LIMIT 1;
   ```

4. **Send test email**
   - Assign student to class with Meet link
   - Verify email includes clickable Meet link button

### Production Testing

1. Set up production Google Calendar
2. Deploy to Coolify with Google credentials
3. Create test class and verify Meet link generation
4. Verify email sends with Meet link
5. Click Meet link in email and verify it opens

---

## Error Handling

### What If Google Credentials Are Invalid?

**Behavior**:
- Class creation still succeeds
- `meetLink` remains NULL
- Warning logged
- Email sent without Meet link button
- User can manually add link later

### What If Google API Quota Exceeded?

**Behavior**:
- Retry logic with exponential backoff
- Log warning
- Continue with class creation
- User notified in UI

### What If Meet Link Generation Fails?

**Behavior**:
- Don't block class creation
- Set `meetLink = null`
- Log error for debugging
- Email sent without Meet link
- Admin can manually add link

---

## Security Considerations

### ⚠️ Service Account Key Management

**Current Approach** (Development):
- Store in .env file (NOT committed)
- Base64 encoded

**Future Approach** (Phase 2):
- Store in SystemSettings table (encrypted)
- Use Superadmin UI to manage

### ⚠️ Calendar Event Visibility

**Recommended**:
- Create events in service account calendar
- Only service account has write access
- Users access via generated Meet link

### ⚠️ Meet Link Sharing

**Best Practice**:
- Include in email notifications
- Display in UI for instructors
- Link is shareable (by design)

---

## Alternative Approaches

### Option 1: Google Calendar API (Recommended)
- ✅ Generates Meet link as event detail
- ✅ Free with Google Workspace
- ✅ Reliable and tested
- ❌ Requires Google account

### Option 2: Google Meet API (Direct)
- ✅ Creates Meet directly without calendar event
- ✅ Newer API
- ❌ May have quota limits
- ❌ Less tested

### Option 3: Manual Links
- ✅ No API needed
- ✅ Full control
- ❌ User must create links
- ❌ Not automated

---

## Success Criteria

### Minimum (MVP)
- [ ] Meet links automatically generated when class created
- [ ] Links stored in database
- [ ] Links included in emails
- [ ] Links clickable and open Google Meet

### Nice to Have
- [ ] Display Meet link in class details
- [ ] Show link generation status
- [ ] Allow manual link override
- [ ] Show meeting stats

### Future
- [ ] Automatic recording storage
- [ ] Meeting history logging
- [ ] Alternative providers (Zoom, Teams)

---

## Questions to Answer Before Implementation

1. **Do you have a Google Workspace account?**
   - Needed for Calendar API access
   - Free tier has limits

2. **Should Meet links be public or private?**
   - Public: Anyone with link can join
   - Private: Calendar based (more secure)

3. **Should we use Calendar API or Meet API directly?**
   - Calendar: Easier, includes event context
   - Meet: Direct, simpler

4. **Should we store credentials in .env or database?**
   - .env: Easy for now, unsafe long-term
   - Database: Secure, requires encryption (Phase 2)

5. **Should we generate links on class creation or on-demand?**
   - Creation: Immediate, always ready
   - On-demand: Saves quota, user-triggered

---

## Next Steps

1. **Get answers** to questions above
2. **Set up Google Cloud Project** (see Phase 1)
3. **Provide service account key file** (base64 encoded)
4. **Set environment variables** in Coolify
5. **Implement `lib/googleMeet.ts`** service
6. **Test locally** before deployment
7. **Deploy to Coolify** and verify

---

## Resources

- [Google Calendar API Docs](https://developers.google.com/calendar)
- [Google Meet API Docs](https://developers.google.com/meet/api)
- [Google Cloud Console](https://console.cloud.google.com)
- [Service Account Setup Guide](https://cloud.google.com/docs/authentication/getting-started)

---

## Summary

To implement Google Meet integration, we need:

1. ✅ Database field (already exists: `Class.meetLink`)
2. ⏳ Google Cloud Project setup (user action)
3. ⏳ Service account credentials (user action)
4. ⏳ `lib/googleMeet.ts` service (development)
5. ⏳ Integration with class API (development)
6. ⏳ Frontend display (development)

**Ready to start when you provide Google credentials!**
