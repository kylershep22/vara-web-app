# Firebase Email Verification Setup Guide

This document describes how to configure Firebase Authentication email templates and action URLs for the Vara wellness app.

---

## Overview

When users sign up for Vara, Firebase sends a verification email. This guide covers:
1. Customizing the email template
2. Setting the action URL to point to our branded landing page
3. Testing the verification flow

---

## Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the **vara-4a99f** project
3. Navigate to **Authentication** in the left sidebar
4. Click on the **Templates** tab

---

## Step 2: Configure Email Verification Template

### Edit the Template

1. In the Templates tab, find **Email address verification**
2. Click the **pencil icon** to edit

### Template Settings

Configure these settings:

| Setting | Value |
|---------|-------|
| **Subject** | `Verify your email — Vara` |
| **Sender name** | `Vara` |
| **Reply-to address** | `noreply@vara.health` (or leave default) |

### Template Body

Firebase has limited HTML support in built-in templates. Use this simplified template:

```
Hi %DISPLAY_NAME%,

Thanks for creating a Vara account. Click the link below to verify your email address:

%LINK%

This link will expire in 24 hours. If you didn't create a Vara account, you can safely ignore this email.

— The Vara Team
```

**Note:** Firebase's built-in email system doesn't support custom HTML styling or images. For fully branded emails with the Vara logo and styled buttons, you would need to configure a custom SMTP provider (SendGrid, Mailgun, Postmark, etc.) via Firebase's SMTP settings.

---

## Step 3: Configure Action URL

The action URL determines where users land when they click the verification link in the email.

### Set Custom Action URL

1. In the Email Templates section, find **Action URL** at the bottom
2. Click to edit
3. Set the URL to: `https://vara-4a99f.web.app/auth/action`

This points to our branded React page (`src/pages/AuthAction.jsx`) which handles:
- Email verification
- Password reset
- Email recovery

### URL Parameters

Firebase automatically appends these query parameters to the action URL:

| Parameter | Description |
|-----------|-------------|
| `mode` | Action type: `verifyEmail`, `resetPassword`, or `recoverEmail` |
| `oobCode` | One-time code to verify the action |
| `apiKey` | Firebase API key |
| `lang` | User's language preference |
| `continueUrl` | Optional redirect URL after action |

Our `AuthAction.jsx` page reads these parameters and processes the verification using Firebase's `applyActionCode()` method.

---

## Step 4: Test the Flow

### Testing Email Verification

1. **Create a new account** in the Vara app
2. **Check your email** for the verification message
3. **Click the verification link** in the email
4. **Verify the landing page** shows:
   - Vara branding
   - Animated checkmark on success
   - "Open Vara" deep link button
   - "Continue on Web" fallback
   - App store links
5. **Click "Open Vara"** to verify the deep link works (requires the app installed)

### Testing Error States

Test these scenarios:
- **Expired link**: Wait 24 hours or use an old link
- **Already used link**: Click the same link twice
- **Invalid link**: Modify the `oobCode` parameter

Error messages should be supportive (per Vara brand guidelines):
- "Something didn't go through" instead of "Error" or "Failed"
- "This link may have expired" instead of "Invalid link"

---

## Custom SMTP (Future Enhancement)

For fully branded emails with:
- Vara logo images
- Styled CTA buttons
- Custom HTML/CSS

You would need to configure a custom SMTP provider:

1. Go to Firebase Console → Authentication → Settings
2. Find **SMTP Settings** section
3. Configure your SMTP provider (SendGrid recommended)
4. Update sender email to `noreply@vara.health`
5. Create custom email templates in your SMTP provider

The HTML email template from the original spec can then be used with full styling support.

---

## Troubleshooting

### Email Not Received

- Check spam/junk folder
- Verify the email address is correct
- Check Firebase Console → Authentication → Users for the account
- Firebase has rate limits on email sending

### Action Link Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Link expired" | More than 24 hours old | Request new verification email |
| "Link invalid" | Already used or corrupted | Request new verification email |
| "Auth/invalid-action-code" | Code was modified | Use original link from email |

### Deep Link Not Working

- Deep links require a built app (not Expo Go)
- Verify `vara://` scheme is configured in `app.json`
- Clear app cache and try again
- On iOS, may need to rebuild with `expo prebuild`

---

## Related Files

| File | Purpose |
|------|---------|
| `src/pages/AuthAction.jsx` | Web landing page for email actions |
| `src/styles/custom.css` | CSS animations for success checkmark |
| `mobile/src/screens/auth/EmailVerificationScreen.tsx` | Mobile "Check Your Email" screen |
| `mobile/app.json` | Deep link configuration |
| `mobile/src/navigation/linking.ts` | React Navigation linking config |

---

## Support

For issues with email verification:
1. Check this documentation
2. Review Firebase Console logs
3. Test with Firebase Emulator for local development
4. Contact the development team
